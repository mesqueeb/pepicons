import * as fs from 'fs'
import rimraf from 'rimraf'
import copyfiles from 'copyfiles'
import Renamer from 'renamer'
import debounce from 'debounce'
import replace from 'replace-in-file'
import Sort from 'fast-sort'
import { pascalCase } from 'case-anything'
import { filePathToIconName, filePathToIconSynonyms, filePathToIconCategory } from './utils.js'
import { listFiles } from './_listFiles.js'
const { sort } = Sort
const renamer = new Renamer()

const PATH_PEPICONS = './packages/pepicons'

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 100))

const deleteIconsFolder = () =>
  new Promise((resolve, reject) => {
    rimraf(PATH_PEPICONS + '/src/icons', resolve)
  })

const copyPopSvgs = () =>
  new Promise((resolve, reject) => {
    const from = PATH_PEPICONS + '/svg/pop/*.svg'
    const to = PATH_PEPICONS + '/src/icons/'
    copyfiles([from, to], { up: 3 }, resolve)
  })

const copyPrintSvgs = () =>
  new Promise((resolve, reject) => {
    const from = PATH_PEPICONS + '/svg/print/*.svg'
    const to = PATH_PEPICONS + '/src/icons/'
    copyfiles([from, to], { up: 3 }, resolve)
  })

const renameSvgsToTs = () =>
  new Promise((resolve, reject) => {
    renamer.on('replace-result', (replaceResult) => {
      debounce(resolve, 200)()
    })
    const path = PATH_PEPICONS + '/src/icons/**/*.svg'
    renamer.rename({
      files: [path],
      find: '.svg',
      replace: '.ts',
    })
  })

const formatToExportSvgString = () =>
  new Promise((resolve, reject) => {
    const path = PATH_PEPICONS + '/src/icons/**/*.ts'
    replace({
      files: path,
      from: /([\S\s]+)\n*/g,
      to: (...args) => `export default \`${args[1]}\`\n`,
    })
      .then(resolve)
      .catch(reject)
  })

const autoGeneratedWarning = `/** Do not edit! This file is auto-generated. */`

/**
 * @param {'pop' | 'print' | 'synonyms' | 'categories' | 'types'} kind
 */
const filesArrayToExportFileContents = (kind = 'pop', iconNameFilePathEntries = []) => {
  const importTypePepicon =
    kind === 'print'
      ? `import { PepiconPrint } from '../types'`
      : kind === 'pop' || kind === 'synonyms'
      ? `import { Pepicon } from '../types'`
      : `import { Pepicon } from './types'`

  if (kind === 'pop' || kind === 'print') {
    // imports
    const importStatements = iconNameFilePathEntries
      .map(([iconName, filePath]) => {
        return `import ${pascalCase(iconName)} from './${kind}/${filePathToIconName(filePath)}'\n`
      })
      .join('')

    // exports
    const pepiconSvgExports = iconNameFilePathEntries
      .map(([iconName]) => {
        return `export const ${kind}${pascalCase(iconName)} = ${pascalCase(iconName)}\n`
      })
      .join('')
    const pepiconSvgDic = iconNameFilePathEntries
      .map(([iconName]) => `  '${iconName}': ${pascalCase(iconName)},\n`)
      .join('')

    const exportSvgDic =
      kind === 'print'
        ? `export const ${kind}: { [name in PepiconPrint]: string } = {\n${pepiconSvgDic}}`
        : `export const ${kind}: { [name in Pepicon]: string } = {\n${pepiconSvgDic}}`
    // all together
    return `${autoGeneratedWarning}

  // ======= //
 /* IMPORTS */
// ======= //
${importTypePepicon}
${importStatements}

  // ======= //
 /* EXPORTS */
// ======= //
${pepiconSvgExports}

${exportSvgDic}
`
  }

  if (kind === 'types') {
    const pepiconArray = `[${iconNameFilePathEntries
      .map(([iconName]) => `'${iconName}'`)
      .join(', ')}]`
    const pepiconType = iconNameFilePathEntries.map(([iconName]) => `'${iconName}'`).join(' | ')
    const pepiconPrintType = `Exclude<Pepicon, ${iconNameFilePathEntries
      .flatMap(([iconName]) => (iconName.endsWith('-filled') ? `'${iconName}'` : []))
      .join(' | ')}>`
    return `${autoGeneratedWarning}

export type Pepicon = ${pepiconType}
export const pepiconArray: Pepicon[] = ${pepiconArray}
export type PepiconPrint = ${pepiconPrintType}
`
  }

  if (kind === 'categories') {
    const allCategories = new Set()
    const categoryProps = iconNameFilePathEntries
      .map(([iconName, filePath]) => {
        allCategories.add(filePathToIconCategory(filePath))
        return `  '${iconName}': '${filePathToIconCategory(filePath)}',\n`
      })
      .join('')

    const cats = sort([...allCategories]).desc()
    const categoryArray = `[${cats.map((c) => `'${c}'`).join(', ')}]`
    const pepiconCategoryDic = `export const pepiconCategoryDic: { [name in Pepicon]: string } = {\n${categoryProps}}`
    return `${autoGeneratedWarning}

${importTypePepicon}
export const categories: string[] = ${categoryArray}
${pepiconCategoryDic}
`
  }

  if (kind === 'synonyms') {
    const iconSynonymArray = filePath => `[${filePathToIconSynonyms(filePath).map(s => `'${s}'`).join(', ')}]` // prettier-ignore
    const synonymProps = iconNameFilePathEntries
      .map(([iconName, filePath]) => `  '${iconName}': ${iconSynonymArray(filePath)},\n`)
      .join('')
    return `${autoGeneratedWarning}\n\n${importTypePepicon}\n\nexport const synonyms: { [name in Pepicon]: string[] } = {\n${synonymProps}}\n`
  }
}

/**
 * @param {'pop' | 'print' | 'synonyms' | 'categories' | 'types'} kind
 */
const generateExportsFile = async (kind = 'pop', iconNameFilePathEntries = []) => {
  const content = filesArrayToExportFileContents(kind, iconNameFilePathEntries)
  const path =
    kind === 'pop' || kind === 'print'
      ? PATH_PEPICONS + `/src/icons/${kind}.ts`
      : kind === 'synonyms'
      ? PATH_PEPICONS + `/src/synonyms/en.ts`
      : PATH_PEPICONS + `/src/${kind}.ts`
  fs.writeFileSync(path, content)
}

/**
 * @param {'pop' | 'print'} kind
 */
const getIconNameFilePathEntries = async (kind = 'pop') => {
  const regex = new RegExp(`.+${kind}\/.+\.svg`, 'gi')
  const files = await listFiles(PATH_PEPICONS + `/export/`, regex)
  const iconNameFilePathEntries = files.map((filePath) => [
    filePathToIconName(filePath),
    filePath.split('/').slice(-2).join('/'), // prettier-ignore
  ])
  return sort(iconNameFilePathEntries).asc((entry) => entry[0])
}

const generateIndexFiles = async () => {
  const iconNameFilePathEntries__pop = await getIconNameFilePathEntries('pop')
  const iconNameFilePathEntries__print = await getIconNameFilePathEntries('print')
  // write several required files
  await Promise.all([
    generateExportsFile('pop', iconNameFilePathEntries__pop),
    generateExportsFile('print', iconNameFilePathEntries__print),
    generateExportsFile('types', iconNameFilePathEntries__pop),
    generateExportsFile('categories', iconNameFilePathEntries__pop),
    generateExportsFile('synonyms', iconNameFilePathEntries__pop),
  ])
  // write one more index file
  const path = PATH_PEPICONS + '/src/index.ts'
  const content = `${autoGeneratedWarning}

export { Pepicon, PepiconPrint, pepiconArray } from './types'
export { categories, pepiconCategoryDic } from './categories'
export { synonyms } from './synonyms/en'
export { synonyms as synonymsJa } from './synonyms/ja'
export * from './icons/pop'
export * from './icons/print'
`
  fs.writeFileSync(path, content)
}

/**
 * @returns {Promise<void>}
 */
export async function generateSvgStrings() {
  await deleteIconsFolder()
  await copyPopSvgs()
  await copyPrintSvgs()
  await renameSvgsToTs()
  await formatToExportSvgString()
  await generateIndexFiles()
}
