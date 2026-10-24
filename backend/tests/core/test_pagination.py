import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from core.pagination import StandardResultsSetPagination, AdminPagination


@pytest.mark.django_db
class TestPagination:
    def setup_method(self):
        self.factory = APIRequestFactory()

    def _get_request(self, path):
        wsgi_request = self.factory.get(path)
        return Request(wsgi_request)

    def test_standard_results_set_pagination_returns_navigation_metadata(self):
        queryset = list(range(1, 26))  # 25 items
        paginator = StandardResultsSetPagination()
        request = self._get_request('/items/?page=1')

        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(page)

        assert response.status_code == 200
        data = response.data
        assert data['count'] == 25
        assert data['total_pages'] == 3
        assert data['current_page'] == 1
        assert data['page_size'] == 10
        assert len(data['results']) == 10
        assert data['next'] is not None
        assert data['previous'] is None

    def test_standard_results_set_pagination_custom_page_size(self):
        queryset = list(range(1, 26))  # 25 items
        paginator = StandardResultsSetPagination()
        request = self._get_request('/items/?page=1&page_size=20')

        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(page)

        assert response.status_code == 200
        data = response.data
        assert data['count'] == 25
        assert data['total_pages'] == 2
        assert data['current_page'] == 1
        assert data['page_size'] == 20
        assert len(data['results']) == 20

    def test_standard_results_set_pagination_empty_list(self):
        queryset = []
        paginator = StandardResultsSetPagination()
        request = self._get_request('/items/?page=1')

        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(page)

        assert response.status_code == 200
        data = response.data
        assert data['count'] == 0
        assert data['total_pages'] == 1
        assert data['current_page'] == 1
        assert data['page_size'] == 10
        assert len(data['results']) == 0

    def test_admin_pagination_inherits_metadata_and_attaches_metrics(self):
        queryset = list(range(1, 15))  # 14 items
        paginator = AdminPagination()
        paginator.metrics = {'active_users': 42}
        request = self._get_request('/admin/items/?page=2')

        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(page)

        assert response.status_code == 200
        data = response.data
        assert data['count'] == 14
        assert data['total_pages'] == 2
        assert data['current_page'] == 2
        assert data['page_size'] == 10
        assert len(data['results']) == 4
        assert data['metrics'] == {'active_users': 42}
