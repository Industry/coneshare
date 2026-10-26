import unittest
from unittest.mock import AsyncMock, patch
from coneshare_mcp.client import ConeshareClient
from tests.base import BaseMCPTestCase


class TestClientPathSecurity(BaseMCPTestCase):
    """
    T4-02: Verifies that resource identifiers are validated against standard
    format constraints before issuing any HTTP request.
    """

    INVALID_RESOURCE_IDS = [
        "../admin/users",
        "../../trash/empty",
        "../../../api-keys",
        "foo/bar",
        "doc/123",
        "doc\\123",
        "id?admin=true",
        "id#fragment",
        "%2e%2e/admin",
        "%2e%2e%2f",
        "..",
        "/etc/passwd",
        "",
        " ",
        "id with space",
    ]

    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.client = ConeshareClient(api_key="cs_live_testkey123456789")
        # Mock _request to ensure no actual network requests can succeed
        self.mock_request = AsyncMock(return_value={"status": "ok"})
        self.patcher = patch.object(self.client, "_request", self.mock_request)
        self.patcher.start()

    async def asyncTearDown(self):
        self.patcher.stop()
        await super().asyncTearDown()

    async def test_get_document_validates_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.get_document(payload)
                self.mock_request.assert_not_called()

    async def test_delete_document_validates_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.delete_document(payload)
                self.mock_request.assert_not_called()

    async def test_update_document_validates_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.update_document(payload, name="test")
                self.mock_request.assert_not_called()

    async def test_document_analytics_validates_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.get_document_analytics(payload)
                self.mock_request.assert_not_called()

    async def test_folder_methods_validate_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.update_folder(payload, name="test")
                with self.assertRaises(ValueError):
                    await self.client.delete_folder(payload)
                self.mock_request.assert_not_called()

    async def test_move_items_validates_destination_and_item_identifiers(self):
        # Empty string destination must be rejected, not coerced to None
        with self.assertRaises(ValueError):
            await self.client.move_items(destination_folder_id="", document_ids=["doc1"])
        self.mock_request.assert_not_called()

        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.move_items(destination_folder_id=payload, document_ids=["doc1"])
                with self.assertRaises(ValueError):
                    await self.client.move_items(destination_folder_id="valid_dest", document_ids=[payload])
                with self.assertRaises(ValueError):
                    await self.client.move_items(destination_folder_id="valid_dest", folder_ids=[payload])
                self.mock_request.assert_not_called()

    async def test_create_dataroom_validates_document_ids_before_request(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.create_dataroom(name="New Dataroom", document_ids=[payload])
                self.mock_request.assert_not_called()

    async def test_dataroom_methods_validate_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.get_dataroom(payload)
                with self.assertRaises(ValueError):
                    await self.client.update_dataroom(payload, name="test")
                with self.assertRaises(ValueError):
                    await self.client.delete_dataroom(payload)
                with self.assertRaises(ValueError):
                    await self.client.add_content_to_dataroom(payload, document_ids=["doc1"])
                with self.assertRaises(ValueError):
                    await self.client.remove_content_from_dataroom(payload, document_ids=["doc1"])
                self.mock_request.assert_not_called()

    async def test_share_link_methods_validate_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.update_share_link(payload, data={"is_active": False})
                self.mock_request.assert_not_called()

    async def test_analytics_methods_validate_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.get_view_session(payload)
                self.mock_request.assert_not_called()

    async def test_admin_user_methods_validate_identifier_format(self):
        for payload in self.INVALID_RESOURCE_IDS:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    await self.client.get_admin_user_details(payload)
                self.mock_request.assert_not_called()

    async def test_valid_resource_ids_are_accepted(self):
        valid_ids = [
            "01JBYZ3P5V8E5WQ9C1V2K3M4N5",  # Standard 26-char ULID
            "doc_1234567890",
            "folder-abc-xyz",
            "user_01H9YQ5K6R7S8T9U0V1W2X3Y4Z",
            "simple123",
        ]
        for valid_id in valid_ids:
            with self.subTest(valid_id=valid_id):
                await self.client.get_document(valid_id)
                self.mock_request.assert_called_with("GET", f"/documents/{valid_id}/")
                self.mock_request.reset_mock()


if __name__ == "__main__":
    unittest.main()
