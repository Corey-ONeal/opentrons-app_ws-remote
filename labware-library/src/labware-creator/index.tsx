/* eslint-disable @typescript-eslint/no-var-requires */
import assert from 'assert'
import Ajv from 'ajv'
import cx from 'classnames'
import * as React from 'react'
import { Formik } from 'formik'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { reportEvent } from '../analytics'
import { reportErrors } from './analyticsUtils'
import { AlertModal, PrimaryButton } from '@opentrons/components'
import labwareSchema from '@opentrons/shared-data/labware/schemas/2.json'
import { maskLoadName } from './fieldMasks'
import {
  aluminumBlockAutofills,
  aluminumBlockChildTypeOptions,
  aluminumBlockTypeOptions,
  getDefaultFormState,
  tubeRackAutofills,
  tubeRackInsertOptions,
} from './fields'
import { makeAutofillOnChange } from './utils/makeAutofillOnChange'
import { labwareDefToFields } from './labwareDefToFields'
import { labwareFormSchema } from './labwareFormSchema'
import {
  formLevelValidation,
  LabwareCreatorErrors,
} from './formLevelValidation'
import { getDefaultDisplayName, getDefaultLoadName } from './formSelectors'
import { labwareTestProtocol, pipetteNameOptions } from './labwareTestProtocol'
import { fieldsToLabware } from './fieldsToLabware'
import { LabwareCreator as LabwareCreatorComponent } from './components/LabwareCreator'
import { ConditionalLabwareRender } from './components/ConditionalLabwareRender'
import { Dropdown } from './components/Dropdown'
import { FormLevelErrorAlerts } from './components/FormLevelErrorAlerts'
import { IntroCopy } from './components/IntroCopy'
import { LinkOut } from './components/LinkOut'

import { Section } from './components/Section'
import { TextField } from './components/TextField'

import { ImportErrorModal } from './components/ImportErrorModal'
import { CreateNewDefinition } from './components/sections/CreateNewDefinition'
import { UploadExisting } from './components/sections/UploadExisting'

import { CustomTiprackWarning } from './components/sections/CustomTiprackWarning'
import { HandPlacedTipFit } from './components/sections/HandPlacedTipFit'
import { Regularity } from './components/sections/Regularity'
import { Footprint } from './components/sections/Footprint'
import { Height } from './components/sections/Height'
import { Grid } from './components/sections/Grid'
import { Volume } from './components/sections/Volume'
import { WellShapeAndSides } from './components/sections/WellShapeAndSides'
import { WellBottomAndDepth } from './components/sections/WellBottomAndDepth'
import { WellSpacing } from './components/sections/WellSpacing'
import { GridOffset } from './components/sections/GridOffset'

import styles from './styles.css'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  ImportError,
  LabwareFields,
  ProcessedLabwareFields,
} from './fields'

const ajv = new Ajv()
const validateLabwareSchema = ajv.compile(labwareSchema)

const PDF_URL =
  'https://opentrons-publications.s3.us-east-2.amazonaws.com/labwareDefinition_testGuide.pdf'

export const LabwareCreator = (): JSX.Element => {
  const [
    showExportErrorModal,
    _setShowExportErrorModal,
  ] = React.useState<boolean>(false)
  const setShowExportErrorModal = React.useMemo(
    () => (v: boolean, fieldValues?: LabwareFields) => {
      // NOTE: values that take a default will remain null in this event
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
      if (v === true) {
        assert(
          fieldValues,
          'expected `fieldValues` when setting showExportErrorModal to true'
        )
        reportEvent({
          name: 'labwareCreatorFileExport',
          properties: {
            labwareType: fieldValues?.labwareType,
            labwareDisplayName: fieldValues?.displayName,
            labwareAPIName: fieldValues?.loadName,
            labwareBrand: fieldValues?.brand,
            labwareManufacturerID: fieldValues?.brandId,
            exportSuccess: false,
            exportError: true,
          },
        })
      }
      _setShowExportErrorModal(v)
    },
    [_setShowExportErrorModal]
  )

  const [showCreatorForm, setShowCreatorForm] = React.useState<boolean>(false)

  const [importError, _setImportError] = React.useState<ImportError | null>(
    null
  )
  const setImportError = React.useMemo(
    () => (v: ImportError | null, def?: LabwareDefinition2) => {
      if (v != null) {
        reportEvent({
          name: 'labwareCreatorFileImport',
          properties: {
            labwareDisplayName: def?.metadata.displayName,
            labwareAPIName: def?.parameters.loadName,
            labwareBrand: def?.brand.brand,
            importSuccess: false,
            importError: v.key,
          },
        })
      }
      _setImportError(v)
    },
    [_setImportError]
  )

  const [lastUploaded, _setLastUploaded] = React.useState<LabwareFields | null>(
    null
  )
  const setLastUploaded = React.useMemo(
    () => (v: LabwareFields | null, def?: LabwareDefinition2) => {
      if (v != null) {
        assert(def, "setLastUploaded expected `def` if `v` isn't null")
        reportEvent({
          name: 'labwareCreatorFileImport',
          properties: {
            labwareType: v.labwareType,
            labwareDisplayName: def?.metadata.displayName,
            labwareAPIName: def?.parameters.loadName,
            labwareBrand: def?.brand.brand,
            labwareManufacturerID: v.brandId,
            importSuccess: true,
            importError: null,
          },
        })
      }
      _setLastUploaded(v)
    },
    [_setLastUploaded]
  )

  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  const scrollToForm = React.useCallback(() => {
    setShowCreatorForm(true)
    window.scrollTo({
      left: 0,
      // @ts-expect-error(IL, 2021-03-24): needs code change to ensure no null to `top`
      top: scrollRef.current && scrollRef.current.offsetTop - 200,
      behavior: 'smooth',
    })
  }, [scrollRef])

  // if showCreatorForm has changed and is a truthy value, it must have been false -> true. Scroll to it
  React.useEffect(() => {
    if (showCreatorForm) {
      scrollToForm()
    }
  }, [showCreatorForm, scrollToForm])

  const onUpload = React.useCallback(
    (
      event:
        | React.DragEvent<HTMLLabelElement>
        | React.ChangeEvent<HTMLInputElement>
    ) => {
      let files: FileList | never[] = []
      if ('dataTransfer' in event && event.dataTransfer.files !== null) {
        files = event.dataTransfer.files
      } else if ('files' in event.target && event.target.files !== null) {
        files = event.target.files
      }

      const file = files[0]
      const reader = new FileReader()

      // reset the state of the input to allow file re-uploads
      if ('value' in event.currentTarget) {
        event.currentTarget.value = ''
      }

      if (!file.name.endsWith('.json')) {
        setImportError({ key: 'INVALID_FILE_TYPE' })
      } else {
        reader.onload = readEvent => {
          const result = (readEvent.currentTarget as FileReader).result
          let parsedLabwareDef: LabwareDefinition2

          try {
            parsedLabwareDef = JSON.parse(result as string)
          } catch (error) {
            console.error(error)
            setImportError({
              key: 'INVALID_JSON_FILE',
              messages: [error.message],
            })
            return
          }

          if (!validateLabwareSchema(parsedLabwareDef)) {
            console.warn(validateLabwareSchema.errors)

            setImportError({
              key: 'INVALID_LABWARE_DEF',
              // @ts-expect-error(IL, 2021-03-24): ajv def mixup
              messages: validateLabwareSchema.errors.map(
                ajvError =>
                  `${ajvError.schemaPath}: ${
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    ajvError.message
                  }. (${JSON.stringify(ajvError.params)})`
              ),
            })
            return
          }
          const fields = labwareDefToFields(parsedLabwareDef)
          if (!fields) {
            setImportError(
              { key: 'UNSUPPORTED_LABWARE_PROPERTIES' },
              parsedLabwareDef
            )
            return
          }
          setLastUploaded(fields, parsedLabwareDef)
          if (
            fields.labwareType === 'wellPlate' ||
            fields.labwareType === 'reservoir'
          ) {
            // no additional required labware type child fields, we can scroll right away
            scrollToForm()
          }
        }
        reader.readAsText(file)
      }
    },
    [scrollToForm, setLastUploaded, setImportError]
  )

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // NOTE: the contents of this message will be overridden by modern browsers
      window.onbeforeunload = () =>
        'Are you sure you want to leave? You may have unsaved changes.'
      return () => {
        window.onbeforeunload = null
      }
    }
  })

  return (
    <LabwareCreatorComponent>
      {importError && (
        <ImportErrorModal
          onClose={() => setImportError(null)}
          importError={importError}
        />
      )}
      {showExportErrorModal && (
        <AlertModal
          className={styles.error_modal}
          heading="Cannot export file"
          onCloseClick={() => setShowExportErrorModal(false)}
          buttons={[
            {
              onClick: () => setShowExportErrorModal(false),
              children: 'close',
            },
          ]}
        >
          Please resolve all invalid fields in order to export the labware
          definition
        </AlertModal>
      )}
      <Formik
        initialValues={lastUploaded || getDefaultFormState()}
        enableReinitialize
        validationSchema={labwareFormSchema}
        validate={formLevelValidation}
        onSubmit={(values: LabwareFields) => {
          const castValues: ProcessedLabwareFields = labwareFormSchema.cast(
            values
          )
          const { pipetteName } = castValues
          const def = fieldsToLabware(castValues)
          const { displayName } = def.metadata
          const { loadName } = def.parameters

          const zip = new JSZip()
          zip.file(`${loadName}.json`, JSON.stringify(def, null, 4))
          zip.file(
            `test_${loadName}.py`,
            labwareTestProtocol({ pipetteName, definition: def })
          )

          // TODO(IL, 2021-03-31): add `catch`
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          zip.generateAsync({ type: 'blob' }).then(blob => {
            saveAs(blob, `${loadName}.zip`)
          })

          reportEvent({
            name: 'labwareCreatorFileExport',
            properties: {
              labwareType: castValues.labwareType,
              labwareDisplayName: displayName,
              labwareAPIName: castValues.loadName,
              labwareBrand: castValues.brand,
              labwareManufacturerID: castValues.brandId,
              exportSuccess: true,
              exportError: null,
            },
          })
        }}
      >
        {bag => {
          const {
            handleSubmit,
            values,
            isValid,
            touched,
            setTouched,
            setValues,
          } = bag
          const errors: LabwareCreatorErrors = bag.errors

          // @ts-expect-error(IL, 2021-03-24): values/errors/touched not typed for reportErrors to be happy
          reportErrors({ values, errors, touched })
          // TODO (ka 2019-8-27): factor out this as sub-schema from Yup schema and use it to validate instead of repeating the logic
          const canProceedToForm = Boolean(
            values.labwareType === 'wellPlate' ||
              values.labwareType === 'reservoir' ||
              values.labwareType === 'tipRack' ||
              (values.labwareType === 'tubeRack' &&
                values.tubeRackInsertLoadName) ||
              (values.labwareType === 'aluminumBlock' &&
                values.aluminumBlockType === '24well') ||
              (values.labwareType === 'aluminumBlock' &&
                values.aluminumBlockType === '96well' &&
                values.aluminumBlockChildType)
          )

          const labwareTypeChildFields = (
            <>
              {values.labwareType === 'tubeRack' && (
                <Dropdown
                  name="tubeRackInsertLoadName"
                  options={tubeRackInsertOptions}
                  onValueChange={makeAutofillOnChange({
                    name: 'tubeRackInsertLoadName',
                    autofills: tubeRackAutofills,
                    values,
                    touched,
                    setTouched,
                    setValues,
                  })}
                />
              )}
              {values.labwareType === 'aluminumBlock' && (
                <Dropdown
                  name="aluminumBlockType"
                  options={aluminumBlockTypeOptions}
                  onValueChange={makeAutofillOnChange({
                    name: 'aluminumBlockType',
                    autofills: aluminumBlockAutofills,
                    values,
                    touched,
                    setTouched,
                    setValues,
                  })}
                />
              )}
              {values.labwareType === 'aluminumBlock' &&
                values.aluminumBlockType === '96well' && (
                  // Only show for '96well' aluminum block type
                  <Dropdown
                    name="aluminumBlockChildType"
                    options={aluminumBlockChildTypeOptions}
                  />
                )}
            </>
          )

          return (
            <div className={styles.labware_creator}>
              <h2>Custom Labware Creator BETA</h2>
              <IntroCopy />
              <div className={styles.flex_row}>
                <CreateNewDefinition
                  showDropDownOptions={lastUploaded === null}
                  disabled={!canProceedToForm || lastUploaded !== null}
                  labwareTypeChildFields={labwareTypeChildFields}
                  onClick={scrollToForm}
                />
                <UploadExisting
                  disabled={!canProceedToForm}
                  labwareTypeChildFields={labwareTypeChildFields}
                  lastUploaded={lastUploaded}
                  onClick={scrollToForm}
                  onUpload={onUpload}
                />
              </div>
              <div ref={scrollRef} />
              {showCreatorForm && (
                <>
                  {/* PAGE 1 - Labware */}
                  <CustomTiprackWarning />
                  <HandPlacedTipFit />
                  <Regularity />
                  <Footprint />
                  <Height />
                  <Grid />
                  {/* PAGE 2 */}
                  <Volume />
                  <WellShapeAndSides />
                  <WellBottomAndDepth />
                  <WellSpacing />
                  <GridOffset />
                  <Section label="Check your work">
                    <FormLevelErrorAlerts errors={errors} />
                    <div className={styles.preview_labware}>
                      <ConditionalLabwareRender values={values} />
                      <p className={styles.preview_instructions}>
                        Check that the size, spacing, and shape of your wells
                        looks correct.
                      </p>
                    </div>
                  </Section>

                  {/* PAGE 3 */}
                  <Section label="Description" fieldList={['brand', 'brandId']}>
                    <div className={styles.flex_row}>
                      <div className={styles.brand_column}>
                        <TextField name="brand" />
                      </div>
                      <div className={styles.brand_id_column}>
                        <TextField
                          name="brandId"
                          caption="Separate multiple by comma"
                        />
                      </div>
                    </div>
                  </Section>
                  {/* PAGE 4 */}

                  <Section label="File" fieldList={['loadName', 'displayName']}>
                    <div className={styles.flex_row}>
                      <div className={styles.export_form_fields}>
                        <TextField
                          name="displayName"
                          placeholder={getDefaultDisplayName(values)}
                        />
                        <TextField
                          name="loadName"
                          placeholder={getDefaultLoadName(values)}
                          caption="Only lower case letters, numbers, periods, and underscores may be used"
                          inputMasks={[maskLoadName]}
                        />
                      </div>
                    </div>
                  </Section>
                  <Section
                    label="Labware Test Protocol"
                    fieldList={['pipetteName']}
                  >
                    <div className={cx(styles.flex_row, styles.flex_row_start)}>
                      <div className={styles.instructions_column}>
                        <p>
                          Your file will be exported with a protocol that will
                          help you test and troubleshoot your labware definition
                          on the robot. The protocol requires a Single Channel
                          pipette on the right mount of your robot.
                        </p>
                      </div>
                      <div className={styles.pipette_field_wrapper}>
                        <Dropdown
                          name="pipetteName"
                          options={pipetteNameOptions}
                        />
                      </div>
                    </div>
                    <div className={styles.export_section}>
                      <div
                        className={cx(styles.callout, styles.export_callout)}
                      >
                        <h4 className={styles.test_labware_heading}>
                          Please test your definition file!
                        </h4>

                        <p>
                          Use the labware test protocol contained in the
                          downloaded file to check the accuracy of your
                          definition. It???s important to create definitions that
                          are precise and do not rely on excessive calibration
                          prior to each run to achieve accuracy.
                        </p>
                        <p>
                          Use the test guide to troubleshoot your definition.
                        </p>
                        <LinkOut
                          onClick={() =>
                            reportEvent({
                              name: 'labwareCreatorClickTestLabware',
                            })
                          }
                          href={PDF_URL}
                          className={styles.test_guide_button}
                        >
                          view test guide
                        </LinkOut>
                      </div>
                      <PrimaryButton
                        className={styles.export_button}
                        onClick={() => {
                          if (!isValid && !showExportErrorModal) {
                            setShowExportErrorModal(true, values)
                          }
                          handleSubmit()
                        }}
                      >
                        EXPORT FILE
                      </PrimaryButton>
                    </div>
                  </Section>
                </>
              )}
            </div>
          )
        }}
      </Formik>
    </LabwareCreatorComponent>
  )
}
