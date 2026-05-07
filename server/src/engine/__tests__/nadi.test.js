const {
  buildNadiSignificatorTable,
  getInclusiveAspectDistance,
} = require('../nadi');

function makeChart(planetsByHouse) {
  const houses = [];
  for (let i = 1; i <= 12; i++) {
    houses.push({
      houseNumber: i,
      rashiId: i,
      start: (i - 1) * 30,
      midpoint: ((i - 1) * 30) + 15,
      planets: planetsByHouse[i] || [],
    });
  }
  return { houses };
}

describe('Nadi aspect distance', () => {
  test('uses inclusive Vedic sign counting', () => {
    expect(getInclusiveAspectDistance(1, 1)).toBe(1);
    expect(getInclusiveAspectDistance(1, 4)).toBe(4);
    expect(getInclusiveAspectDistance(1, 5)).toBe(5);
    expect(getInclusiveAspectDistance(1, 7)).toBe(7);
    expect(getInclusiveAspectDistance(1, 8)).toBe(8);
    expect(getInclusiveAspectDistance(10, 4)).toBe(7);
  });

  test('includes houses from a planet aspecting Rahu by 7th aspect', () => {
    const sun = { name: 'Sun', rashiId: 1, sidereal: 10 };
    const rahu = { name: 'Rahu', rashiId: 7, sidereal: 190 };
    const ketu = { name: 'Ketu', rashiId: 1, sidereal: 10 };
    const planets = { sun, rahu, ketu };
    const chart = makeChart({ 1: [sun, ketu], 7: [rahu] });

    const table = buildNadiSignificatorTable(chart, chart, planets, { id: 1 }, null);

    expect(table.rahu.planet.houses).toEqual(expect.arrayContaining([1, 5, 7]));
  });
});