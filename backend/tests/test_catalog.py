def test_get_catalog_items(client):
    res = client.get("/api/catalog")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    first = items[0]
    assert "id" in first
    assert "name" in first
    assert "category" in first
    assert "image_url" in first


def test_filter_catalog_by_category(client):
    res = client.get("/api/catalog?category=shirt")
    assert res.status_code == 200
    items = res.json()
    for item in items:
        assert item["category"] == "shirt"


def test_search_catalog(client):
    res = client.get("/api/catalog?search=Oxford")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert "Oxford" in items[0]["name"]


def test_get_garment_not_found(client):
    res = client.get("/api/catalog/non-existent-id-99999")
    assert res.status_code == 404
