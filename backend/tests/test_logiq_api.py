"""LogIQ Backend API Tests"""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://brain-challenge-pro-3.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Root & metadata ----------
def test_root(client):
    r = client.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    data = r.json()
    assert data["message"] == "LogIQ API"
    assert data["total_puzzles"] == 100


def test_list_puzzles(client):
    r = client.get(f"{BASE_URL}/api/puzzles")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 100
    assert data[0]["level"] == 1
    assert set(data[0].keys()) >= {"level", "category", "difficulty"}


# ---------- Puzzle fetch ----------
def test_get_puzzle_1(client):
    r = client.get(f"{BASE_URL}/api/puzzles/1")
    assert r.status_code == 200
    p = r.json()
    assert p["level"] == 1
    assert p["answer"] == "10"
    assert len(p["options"]) == 4
    assert "question" in p


def test_get_puzzle_100(client):
    r = client.get(f"{BASE_URL}/api/puzzles/100")
    assert r.status_code == 200
    assert r.json()["level"] == 100


def test_get_puzzle_404(client):
    r = client.get(f"{BASE_URL}/api/puzzles/999")
    assert r.status_code == 404


# ---------- Daily challenge ----------
def test_daily_challenge(client):
    r = client.get(f"{BASE_URL}/api/daily-challenge")
    assert r.status_code == 200
    p = r.json()
    assert 1 <= p["level"] <= 100
    assert "question" in p and "options" in p and "answer" in p


def test_daily_deterministic(client):
    r1 = client.get(f"{BASE_URL}/api/daily-challenge").json()
    r2 = client.get(f"{BASE_URL}/api/daily-challenge").json()
    assert r1["level"] == r2["level"]


# ---------- AI streaming: hint & explain ----------
def test_hint_stream(client):
    r = client.post(f"{BASE_URL}/api/hint", json={"level": 1}, stream=True, timeout=45)
    assert r.status_code == 200
    body = r.text
    assert len(body.strip()) > 0
    # hint should not directly reveal answer "10"
    # (soft check - just log)
    print(f"HINT: {body[:200]}")


def test_explain_stream(client):
    r = client.post(f"{BASE_URL}/api/explain",
                    json={"level": 1, "user_answer": "10", "correct": True},
                    stream=True, timeout=45)
    assert r.status_code == 200
    body = r.text
    assert len(body.strip()) > 0
    print(f"EXPLAIN: {body[:200]}")


def test_hint_invalid_level(client):
    r = client.post(f"{BASE_URL}/api/hint", json={"level": 999}, timeout=15)
    assert r.status_code == 404
