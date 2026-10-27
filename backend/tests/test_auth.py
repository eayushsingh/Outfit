def test_auth_verify_success(client, admin_headers):
    res = client.post("/api/admin/auth/verify", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["authenticated"] is True


def test_auth_verify_missing_header(client):
    res = client.post("/api/admin/auth/verify")
    assert res.status_code == 401


def test_auth_verify_invalid_token(client):
    res = client.post("/api/admin/auth/verify", headers={"X-Admin-Token": "wrong_token_12345"})
    assert res.status_code == 403


def test_admin_delete_not_found(client, admin_headers):
    res = client.delete("/api/admin/catalog/non-existent-garment-id", headers=admin_headers)
    assert res.status_code == 404
