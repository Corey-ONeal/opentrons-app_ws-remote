import { labwareDefToFields } from '../labwareDefToFields'
import _fixture96Plate from '@opentrons/shared-data/labware/fixtures/2/fixture_96_plate.json'
import _fixture12Trough from '@opentrons/shared-data/labware/fixtures/2/fixture_12_trough.json'
import _fixtureIrregularExample1 from '@opentrons/shared-data/labware/fixtures/2/fixture_irregular_example_1.json'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

const fixture96Plate = _fixture96Plate as LabwareDefinition2
const fixture12Trough = _fixture12Trough as LabwareDefinition2
const fixtureIrregularExample1 = _fixtureIrregularExample1 as LabwareDefinition2

jest.mock('../../definitions')

describe('labwareDefToFields', () => {
  it('fixture_96_plate', () => {
    const def = fixture96Plate
    const result = labwareDefToFields(def)
    expect(result).toEqual({
      labwareType: 'wellPlate',
      tubeRackInsertLoadName: null,
      aluminumBlockType: null,
      aluminumBlockChildType: null,
      handPlacedTipFit: null,

      footprintXDimension: String(def.dimensions.xDimension),
      footprintYDimension: String(def.dimensions.yDimension),
      labwareZDimension: String(def.dimensions.zDimension),

      gridRows: '8',
      gridColumns: '12',
      gridSpacingX: '9',
      gridSpacingY: '9',
      gridOffsetX: String(def.wells.A1.x),
      gridOffsetY: '11.24',

      homogeneousWells: 'true',
      regularRowSpacing: 'true',
      regularColumnSpacing: 'true',

      wellVolume: '380',
      wellBottomShape: 'flat',
      wellDepth: '10.54',
      wellShape: 'circular',

      wellDiameter: '6.4',

      // used with rectangular well shape only
      wellXDimension: null,
      wellYDimension: null,

      brand: 'generic',
      brandId: null,

      loadName: null, // should be cleared
      displayName: null, // should be cleared

      pipetteName: null,
    })
  })

  it('fixture_12_trough', () => {
    // make sure rectangular wells + single row works as expected
    const def = fixture12Trough
    const result = labwareDefToFields(def)

    expect(result?.labwareType).toEqual('reservoir')
    expect(result?.gridSpacingY).toBe(null) // single row -> null Y-spacing
    expect(result?.wellDiameter).toBe(null)
    expect(result).toMatchSnapshot()
  })

  it('fixture_irregular_example_1 should return null (until multi-grid labware is supported in LC)', () => {
    const def = fixtureIrregularExample1
    const result = labwareDefToFields(def)
    expect(result).toEqual(null)
  })
})
