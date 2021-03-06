// @flow
import assert from 'assert'
import type {
  EngageMagnetArgs,
  DisengageMagnetArgs,
} from '@opentrons/step-generation'
import type { HydratedMagnetFormData } from '../../../form-types'

type MagnetArgs = EngageMagnetArgs | DisengageMagnetArgs

export const magnetFormToArgs = (
  hydratedFormData: HydratedMagnetFormData
): MagnetArgs => {
  const { magnetAction, moduleId } = hydratedFormData
  const engageHeight = parseFloat(hydratedFormData.engageHeight)

  assert(
    magnetAction === 'engage' ? !Number.isNaN(engageHeight) : true,
    'magnetFormToArgs expected (hydrated) engageHeight to be non-NaN if magnetAction is "engage"'
  )
  if (magnetAction === 'engage' && !Number.isNaN(engageHeight)) {
    return {
      commandCreatorFnName: 'engageMagnet',
      module: moduleId,
      engageHeight,
    }
  } else {
    return {
      commandCreatorFnName: 'disengageMagnet',
      module: moduleId,
    }
  }
}
