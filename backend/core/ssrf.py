import ipaddress
import logging
import socket
from urllib.parse import urlsplit
from rest_framework import serializers

logger = logging.getLogger(__name__)


class DestinationResolutionError(serializers.ValidationError):
    """Raised when destination hostname DNS resolution fails (may be transient)."""
    pass


AWS_IMDSV6_NET = ipaddress.ip_network('fd00:ec2::/64')

FORBIDDEN_WEBHOOK_HEADERS = {
    'host',
    'content-length',
    'transfer-encoding',
    'connection',
    'upgrade',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'x-internal-api-key',
    'x-forwarded-for',
    'x-real-ip',
    'x-original-url',
    'x-rewrite-url',
}


def _normalize_ip(ip_str: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    clean_ip = ip_str.strip('[]')
    ip = ipaddress.ip_address(clean_ip)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        return ip.ipv4_mapped
    return ip


def validate_outbound_url(url: str) -> str:
    """
    Validates that an outbound webhook URL is safe.
    Since webhooks are strictly configured by organization administrators,
    normal private network addresses (LAN, intranet, Tailscale) and public domains
    are permitted. Loopback (127.0.0.1, localhost) and cloud metadata services
    (169.254.169.254, AWS IMDSv6) are always blocked to guard against misconfiguration.
    """
    if not url:
        return url

    parts = urlsplit(url)
    if parts.scheme.lower() not in ('http', 'https'):
        raise serializers.ValidationError("Endpoint URL must use HTTP or HTTPS protocol.")

    if parts.username or parts.password:
        raise serializers.ValidationError("Credentials in URLs are not permitted.")

    hostname = parts.hostname
    if not hostname:
        raise serializers.ValidationError("URL must contain a valid hostname.")

    hostname_lower = hostname.lower().strip()
    if hostname_lower in ('localhost', '127.0.0.1', '::1'):
        raise serializers.ValidationError("Loopback addresses are not permitted.")

    try:
        port = parts.port or (443 if parts.scheme.lower() == 'https' else 80)
    except ValueError:
        raise serializers.ValidationError("URL contains an invalid port.") from None

    try:
        addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise DestinationResolutionError(f"Cannot resolve destination hostname: {exc}") from exc

    if not addr_info:
        raise serializers.ValidationError(f"No address records found for hostname '{hostname}'.")

    for _, _, _, _, sockaddr in addr_info:
        try:
            ip_obj = _normalize_ip(sockaddr[0])
        except ValueError:
            raise serializers.ValidationError("Invalid destination IP address format.")

        # Guard against loopback, cloud metadata (169.254), multicast, and AWS IMDSv6
        if (
            ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_unspecified
            or ip_obj.is_multicast
            or ip_obj in AWS_IMDSV6_NET
        ):
            logger.warning("Destination host '%s' resolved to blocked address '%s'", hostname, sockaddr[0])
            raise serializers.ValidationError("Loopback and cloud metadata addresses are not permitted.")

    return url


def validate_webhook_headers(headers: dict) -> dict:
    """
    Sanitizes and validates custom headers for webhook destinations.
    Rejects hop-by-hop and internal spoofing headers.
    """
    if not headers or not isinstance(headers, dict):
        return headers

    for key in headers:
        if str(key).strip().lower() in FORBIDDEN_WEBHOOK_HEADERS:
            raise serializers.ValidationError(
                f"Header '{key}' is restricted and cannot be customized."
            )

    return headers
