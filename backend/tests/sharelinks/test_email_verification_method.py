"""Tests for ViewSession.email_verification_method."""
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from sharelinks.models import EmailVerificationToken, ViewSession
from sharelinks.views import _build_visitor_context

pytestmark = pytest.mark.django_db


def _create_session(client, link):
    response = client.post('/api/v1/view-sessions/', {'share_link': link.id})
    assert response.status_code == status.HTTP_201_CREATED
    return ViewSession.objects.get(id=response.json()['id'])


def test_no_email_gate_records_no_method(public_client, share_link):
    vs = _create_session(public_client, share_link)
    assert vs.viewer_email == ''
    assert vs.email_verification_method == ''


def test_typed_email_without_verification_is_self_reported(public_client, share_link_requires_email):
    with patch('sharelinks.views._dispatch_automation_event') as mock_dispatch:
        r = public_client.post(
            f'/api/v1/links/{share_link_requires_email.slug}/request-access/',
            {'email': 'typed@example.com'}, format='json',
        )
        assert r.status_code == status.HTTP_200_OK
        identified = [c for c in mock_dispatch.call_args_list if c.args[1] == 'email_identified']
        assert identified[0].args[2]['email_verification_method'] == 'self_reported'

    vs = _create_session(public_client, share_link_requires_email)
    assert vs.viewer_email == 'typed@example.com'
    assert vs.email_verification_method == 'self_reported'


def test_clicked_verification_link_is_verified(public_client, share_link_requires_email_verification):
    link = share_link_requires_email_verification
    token = EmailVerificationToken.objects.create(share_link=link, email='proven@example.com')
    public_client.get(f'/api/v1/links/{link.slug}/view-data/?accessToken={token.token}')
    with patch('sharelinks.views._dispatch_automation_event') as mock_dispatch:
        r = public_client.post(
            f'/api/v1/links/{link.slug}/verify-access-token/confirm/', {'token': token.token}, format='json',
        )
        assert r.status_code == status.HTTP_200_OK
        identified = [c for c in mock_dispatch.call_args_list if c.args[1] == 'email_identified']
        assert identified[0].args[2]['email_verification_method'] == 'verified'

    vs = _create_session(public_client, link)
    assert vs.viewer_email == 'proven@example.com'
    assert vs.email_verification_method == 'verified'


def test_link_owner_is_owner(api_client, share_link, user):
    vs = _create_session(api_client, share_link)
    assert vs.viewer_email == user.email
    assert vs.email_verification_method == 'owner'


def test_other_logged_in_user_is_account(share_link, user2):
    client = APIClient()
    client.force_authenticate(user=user2)
    vs = _create_session(client, share_link)
    assert vs.viewer_email == user2.email
    assert vs.email_verification_method == 'account'


def test_pre_patch_session_dict_yields_empty_method(public_client, share_link_requires_email):
    session = public_client.session
    session['authorized_share_links'] = {
        str(share_link_requires_email.id): {'email_verified': True, 'viewer_email': 'old@example.com'},
    }
    session.save()
    vs = _create_session(public_client, share_link_requires_email)
    assert vs.viewer_email == 'old@example.com'
    assert vs.email_verification_method == ''


def test_field_exposed_in_api_and_webhook_context(api_client, share_link):
    vs = ViewSession.objects.create(
        share_link=share_link, viewer_email='a@example.com', email_verification_method='verified',
    )
    r = api_client.get(f'/api/v1/view-sessions/{vs.id}/')
    assert r.status_code == status.HTTP_200_OK
    assert r.json()['email_verification_method'] == 'verified'
    assert _build_visitor_context(vs)['email_verification_method'] == 'verified'


def test_field_is_read_only_via_api(api_client, share_link):
    vs = ViewSession.objects.create(share_link=share_link)
    api_client.patch(f'/api/v1/view-sessions/{vs.id}/', {'email_verification_method': 'verified'}, format='json')
    vs.refresh_from_db()
    assert vs.email_verification_method == ''
