import assert from "node:assert/strict"
import test from "node:test"
import { nearestLieu, searchLieux, SENEGAL_REGIONS } from "./senegal-carte"

const REGIONS = [
  "Dakar",
  "Diourbel",
  "Fatick",
  "Kaffrine",
  "Kaolack",
  "Kolda",
  "Kédougou",
  "Louga",
  "Matam",
  "Saint-Louis",
  "Sédhiou",
  "Tambacounda",
  "Thiès",
  "Ziguinchor",
]

test("couvre les 14 régions", () => {
  assert.equal(SENEGAL_REGIONS.length, 14)
  const names = SENEGAL_REGIONS.map((region) => region.name).sort((a, b) => a.localeCompare(b, "fr"))
  assert.deepEqual(names, [...REGIONS].sort((a, b) => a.localeCompare(b, "fr")))
  for (const region of SENEGAL_REGIONS) {
    assert.equal(region.chefLieu.length > 0, true)
  }
})

test("trouve Ziguinchor et Kédougou sans l'accent", () => {
  assert.equal(searchLieux("ziguinchor")[0]?.label, "Ziguinchor")
  assert.equal(searchLieux("ziguinchor")[0]?.area, "Ziguinchor")
  assert.equal(searchLieux("kedougou")[0]?.label, "Kédougou")
  assert.equal(searchLieux("thies")[0]?.label, "Thiès")
  assert.equal(
    searchLieux("thies").some((place) => place.label === "Thiès Nones"),
    false,
  )
})

test("une lettre ne déverse pas les villes", () => {
  assert.deepEqual(searchLieux(""), [])
  assert.deepEqual(searchLieux(" "), [])
  assert.deepEqual(searchLieux("z"), [])
})

test("rattache un GPS proche de Saint-Louis sans déplacer le point", () => {
  const hit = nearestLieu(16.02, -16.49)
  assert.equal(hit?.city, "Saint-Louis")
  assert.equal(hit?.label, "Saint-Louis")
  assert.equal(hit?.lat, 16.02)
  assert.equal(hit?.lng, -16.49)
  assert.equal(nearestLieu(10, -10), null)
})
