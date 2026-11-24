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
    for key in ("defaultTotalSec", "minTotalSec", "maxTotalSec", "stepSec",
                "fastTotalSec", "countdownSec", "fastCountdownSec"):
        assert isinstance(t[key], (int, float)) and t[key] > 0, key
    assert t["minTotalSec"] <= t["defaultTotalSec"] <= t["maxTotalSec"]
    assert t["defaultTotalSec"] == 120
    assert (t["maxTotalSec"] - t["minTotalSec"]) % t["stepSec"] == 0


def test_kai_brush_plans(cfg):
    plans = {p["id"]: p for p in cfg["BRUSH_PLANS"]}
    assert set(plans) == {"kai6", "kai3"}
    assert cfg["DEFAULT_SETTINGS"]["brushPlan"] == "kai6"
    six = [(s["surface"], s["jaw"]) for s in plans["kai6"]["steps"]]
    assert six == [("kau", "unten"), ("kau", "oben"), ("aussen", "unten"), ("aussen", "oben"),
                   ("innen", "unten"), ("innen", "oben")]
    three = [(s["surface"], s["jaw"]) for s in plans["kai3"]["steps"]]
    assert three == [("kau", "beide"), ("aussen", "beide"), ("innen", "beide")]
    for plan in plans.values():
        assert plan["label"].startswith("KAI")


def test_surfaces_and_jaws_german(cfg):
    names = [cfg["SURFACES"][k]["name"] for k in ("kau", "aussen", "innen")]
    assert names == ["Kauflächen", "Außenflächen", "Innenflächen"]
    for s in cfg["SURFACES"].values():
        assert s["how"] and s["motion"].startswith("motion-")
    assert cfg["JAWS"] == {"unten": "unten", "oben": "oben", "beide": "unten und oben"}


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
