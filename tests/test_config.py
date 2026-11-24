"""Checks types, ranges and consistency of the global constants in ``app/js/config.js``."""
import re

import pytest

HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


@pytest.fixture()
def cfg(js):
    """Loads config.js and returns it as a plain dictionary."""
    return js("return JSON.parse(JSON.stringify(m.config));")


def test_timer_values_are_positive_numbers(cfg):
    t = cfg["TIMER"]
    for key in ("defaultTotalSec", "minTotalSec", "maxTotalSec", "stepSec", "zoneCount",
                "fastTotalSec", "countdownSec", "fastCountdownSec"):
        assert isinstance(t[key], (int, float)) and t[key] > 0, key
    assert t["minTotalSec"] <= t["defaultTotalSec"] <= t["maxTotalSec"]
    assert t["defaultTotalSec"] == 120 and t["zoneCount"] == 4
    assert (t["maxTotalSec"] - t["minTotalSec"]) % t["stepSec"] == 0


def test_four_zones_with_german_labels(cfg):
    zones = cfg["ZONES"]
    assert len(zones) == cfg["TIMER"]["zoneCount"]
    assert [z["label"] for z in zones] == ["oben links", "oben rechts", "unten links", "unten rechts"]
    assert len({z["id"] for z in zones}) == 4


def test_zone_orders_are_permutations(cfg):
    assert cfg["ZONE_ORDERS"], "at least one order"
    for order in cfg["ZONE_ORDERS"]:
        assert sorted(order["order"]) == [0, 1, 2, 3], order["id"]
        assert isinstance(order["label"], str) and order["label"]
    assert cfg["DEFAULT_SETTINGS"]["zoneOrder"] in {o["id"] for o in cfg["ZONE_ORDERS"]}


@pytest.mark.parametrize("catalog", ["STICKERS", "OUTFITS", "MOVES"])
def test_catalog_ids_unique_and_named(cfg, catalog):
    items = cfg[catalog]
    ids = [i["id"] for i in items]
    assert len(ids) == len(set(ids)), f"duplicate ids in {catalog}"
    for item in items:
        assert isinstance(item["name"], str) and item["name"].strip(), item


def test_catalog_sizes(cfg):
    assert len(cfg["STICKERS"]) >= 30
    assert len(cfg["OUTFITS"]) >= 8
    assert len(cfg["MOVES"]) == len(cfg["REWARDS"]["moveStreakThresholds"]) + 1


def test_glitter_and_sequin_items(cfg):
    glitter_stickers = [s for s in cfg["STICKERS"] if s["glitter"]]
    assert len(glitter_stickers) == len(cfg["STICKERS"]) // cfg["REWARDS"]["glitterEvery"]
    sequin_outfits = [o for o in cfg["OUTFITS"] if o["sequin"]]
    shiny_outfits = [o for o in cfg["OUTFITS"] if o["sequin"] or o["glitter"]]
    assert len(sequin_outfits) >= 2 and len(shiny_outfits) >= 3
    for o in sequin_outfits:
        assert HEX_COLOR.match(o["sequinFront"]) and HEX_COLOR.match(o["sequinBack"])


def test_outfit_slots_valid(cfg):
    slots = set(cfg["OUTFIT_SLOTS"])
    for o in cfg["OUTFITS"]:
        assert o["slot"] in slots, o


def test_sticker_colors_from_palette(cfg):
    palette = cfg["PALETTE"]
    for value in palette.values():
        assert HEX_COLOR.match(value), value
    for s in cfg["STICKERS"]:
        assert s["color"] in palette, s


def test_reward_rules(cfg):
    r = cfg["REWARDS"]
    assert 0 < r["cutoffHour"] < 24
    assert r["outfitEverySessions"] > 0
    th = r["moveStreakThresholds"]
    assert th == sorted(th) and len(set(th)) == len(th) and th[0] > 0
    assert r["maxRewardsPerDay"] == 2


def test_default_settings_types(cfg):
    s = cfg["DEFAULT_SETTINGS"]
    assert s["totalSec"] == cfg["TIMER"]["defaultTotalSec"]
    assert isinstance(s["music"], bool)
    assert 0 <= s["volume"] <= 1


def test_german_texts_present(cfg):
    text = cfg["TEXT"]
    for key in ("greeting", "ready", "start", "album", "calendar", "pause", "resume",
                "switchTo", "brushNow", "go", "done", "parents", "dressUp", "flipAll",
                "streak", "noGiftNow", "next", "back", "giftTap", "newSticker",
                "newOutfit", "newMove", "morning", "evening"):
        assert isinstance(text[key], str) and text[key].strip(), key
    joined = " ".join(text.values()).lower()
    for english in (" the ", "start brushing", "next zone", "great job"):
        assert english not in f" {joined} "
