import socket
from unittest.mock import patch, MagicMock
import pytest
from rest_framework import status
from rest_framework.exceptions import ValidationError

from automations.models import AutomationDestination, AutomationRule, AutomationDelivery
from automations.serializers import AutomationDestinationSerializer
from automations.tasks import deliver_automation_delivery_task, _build_headers
from core.ssrf import (
    validate_outbound_url,
    validate_webhook_headers,
    DestinationResolutionError,
)


@pytest.mark.django_db
class TestWebhookSSRFProtection:

    def test_rejects_loopback_and_localhost(self):
        with pytest.raises(ValidationError):
            validate_outbound_url('http://127.0.0.1:8000/webhook')

        with pytest.raises(ValidationError):
            validate_outbound_url('http://localhost:8000/webhook')

        with pytest.raises(ValidationError):
            validate_outbound_url('http://[::1]:8000/webhook')

    def test_rejects_cloud_metadata(self):
        with pytest.raises(ValidationError):
            validate_outbound_url('http://169.254.169.254/latest/meta-data/')

        with pytest.raises(ValidationError):
            validate_outbound_url('http://[fd00:ec2::254]/latest/meta-data/')

    def test_rejects_out_of_range_port(self):
        with pytest.raises(ValidationError) as exc_info:
            validate_outbound_url('https://example.com:99999/hook')
        assert 'invalid port' in str(exc_info.value).lower()

    def test_allows_private_rfc1918_for_admin_self_hosted(self):
        # Admins can freely connect webhooks to internal LAN/containers
        url1 = validate_outbound_url('http://192.168.1.11:8080/webhook')
        assert url1 == 'http://192.168.1.11:8080/webhook'

        url2 = validate_outbound_url('http://10.0.0.5:5000/hook')
        assert url2 == 'http://10.0.0.5:5000/hook'

        # BUT loopback and metadata must ALWAYS remain blocked!
        with pytest.raises(ValidationError):
            validate_outbound_url('http://127.0.0.1:8000/webhook')

        with pytest.raises(ValidationError):
            validate_outbound_url('http://169.254.169.254/latest/meta-data/')

    def test_allows_tailscale_cgnat(self):
        url = validate_outbound_url('http://100.64.1.5:8080/webhook')
        assert url == 'http://100.64.1.5:8080/webhook'

    def test_destination_serializer_validates_endpoint_url(self, user):
        serializer = AutomationDestinationSerializer(
            data={
                'name': 'Loopback Destination',
                'destination_type': 'webhook',
                'endpoint_url': 'http://127.0.0.1:8000/webhook',
                'http_method': 'POST',
            },
            context={'request': MagicMock(user=user)}
        )
        assert not serializer.is_valid()
        assert 'endpoint_url' in serializer.errors

    def test_destination_serializer_validates_headers(self, user):
        serializer = AutomationDestinationSerializer(
            data={
                'name': 'Spoofed Destination',
                'destination_type': 'webhook',
                'endpoint_url': 'https://example.com/webhook',
                'http_method': 'POST',
                'headers': {
                    'Host': 'internal.service',
                    'X-Internal-API-Key': 'secret',
                }
            },
            context={'request': MagicMock(user=user)}
        )
        assert not serializer.is_valid()
        assert 'headers' in serializer.errors

    def test_build_headers_strips_forbidden_headers_at_dispatch(self, user):
        destination = AutomationDestination.objects.create(
            organization=user.organization,
            created_by=user,
            name='Stored Forbidden Headers',
            destination_type=AutomationDestination.DestinationType.WEBHOOK,
            endpoint_url='https://example.com/webhook',
            http_method='POST',
            headers={
                'Host': 'evil.internal',
                'X-Internal-API-Key': 'stolen',
                'X-Valid-Header': 'safe',
            }
        )
        rule = AutomationRule.objects.create(
            organization=user.organization,
            created_by=user,
            name='Test Rule',
            scope_type='global',
        )
        delivery = AutomationDelivery.objects.create(
            organization=user.organization,
            rule=rule,
            destination=destination,
            event_type='document_viewed',
            payload={},
        )
        headers = _build_headers(delivery, {})
        assert 'Host' not in headers
        assert 'X-Internal-API-Key' not in headers
        assert headers.get('X-Valid-Header') == 'safe'

    def test_deliver_task_disables_redirects(self, user):
        destination = AutomationDestination.objects.create(
            organization=user.organization,
            created_by=user,
            name='Test Webhook',
            destination_type=AutomationDestination.DestinationType.WEBHOOK,
            endpoint_url='https://example.com/webhook',
            http_method='POST',
        )
        rule = AutomationRule.objects.create(
            organization=user.organization,
            created_by=user,
            name='Test Rule',
            scope_type='global',
            subscribed_events=['document_viewed'],
        )
        rule.destinations.add(destination)
        delivery = AutomationDelivery.objects.create(
            organization=user.organization,
            rule=rule,
            destination=destination,
            event_type='document_viewed',
            payload={'sample': 'data'},
        )

        with patch('automations.tasks.validate_outbound_url', return_value='https://example.com/webhook'), \
             patch('automations.tasks.requests.request') as mock_req:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = 'OK'
            mock_req.return_value = mock_resp

            deliver_automation_delivery_task(str(delivery.id))
            mock_req.assert_called_once()
            _, kwargs = mock_req.call_args
            assert kwargs.get('allow_redirects') is False

    def test_deliver_task_marks_dead_letter_on_loopback_block(self, user):
        destination = AutomationDestination.objects.create(
            organization=user.organization,
            created_by=user,
            name='Internal Loopback Destination',
            destination_type=AutomationDestination.DestinationType.WEBHOOK,
            endpoint_url='http://127.0.0.1:8000/internal',
            http_method='POST',
        )
        rule = AutomationRule.objects.create(
            organization=user.organization,
            created_by=user,
            name='Test Rule',
            scope_type='global',
            subscribed_events=['document_viewed'],
        )
        rule.destinations.add(destination)
        delivery = AutomationDelivery.objects.create(
            organization=user.organization,
            rule=rule,
            destination=destination,
            event_type='document_viewed',
            payload={'sample': 'data'},
        )

        with patch('automations.tasks.requests.request') as mock_req:
            deliver_automation_delivery_task(str(delivery.id))
            mock_req.assert_not_called()

        delivery.refresh_from_db()
        assert delivery.status == AutomationDelivery.Status.DEAD_LETTER
        assert 'Invalid destination URL or blocked address' in delivery.response_body_excerpt

    @patch('automations.tasks.deliver_automation_delivery_task.apply_async')
    def test_deliver_task_retries_on_transient_dns_failure(self, mock_apply_async, user):
        destination = AutomationDestination.objects.create(
            organization=user.organization,
            created_by=user,
            name='Test DNS Failure',
            destination_type=AutomationDestination.DestinationType.WEBHOOK,
            endpoint_url='https://example.com/webhook',
            http_method='POST',
        )
        rule = AutomationRule.objects.create(
            organization=user.organization,
            created_by=user,
            name='Test Rule',
            scope_type='global',
            subscribed_events=['document_viewed'],
        )
        rule.destinations.add(destination)
        delivery = AutomationDelivery.objects.create(
            organization=user.organization,
            rule=rule,
            destination=destination,
            event_type='document_viewed',
            payload={'sample': 'data'},
        )

        with patch('automations.tasks.validate_outbound_url', side_effect=DestinationResolutionError('Temporary failure in name resolution')):
            deliver_automation_delivery_task(str(delivery.id))

        delivery.refresh_from_db()
        assert delivery.status == AutomationDelivery.Status.FAILED
        assert 'DNS resolution failed' in delivery.response_body_excerpt
