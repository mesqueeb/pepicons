import cpy from 'cpy'
import { PATH_PEPICONS } from './helpers/filePathHelpers'
import { globReplace } from './helpers/globReplace'
import { wrapWithCircle, wrapWithOff, wrapWithRound } from './helpers/wrapHelpers'

const types = ['print', 'pop', 'pencil'] as const
const wraps = ['circle-off', 'circle', 'circle-filled', 'off'] as const

async function copyFiles() {
  await Promise.all(
    types
      .map((type) =>
        wraps.map((wrap) => {
          const from = PATH_PEPICONS + `/svg/${type}/*.svg`
          const to = PATH_PEPICONS + `/svg/${type}`
          return cpy(from, to, { rename: (name) => name.replace('.svg', `-${wrap}.svg`) })
        }),
      )
      .flat(),
  )
}

async function mutate(
  type: 'print' | 'pop' | 'pencil',
  wrap: 'circle' | 'circle-filled' | 'off' | 'circle-off',
) {
  const path = PATH_PEPICONS + `/svg/${type}/*-${wrap}.svg`

  if (wrap === 'circle' || wrap === 'circle-off') {
    await globReplace({
      files: path,
      from: /([.\n\r\t\S\s]+)/gi,
      to: (match) => wrapWithCircle(match, type),
    })
  }

  if (wrap === 'circle-filled') {
    await globReplace({
      files: path,
      from: /([.\n\r\t\S\s]+)/gi,
      to: (match, file) => wrapWithRound(file, match, type),
    })
  }

  if (wrap === 'off') {
    await globReplace({
      files: path,
      from: /([.\n\r\t\S\s]+)/gi,
      to: (match) => wrapWithOff(match, type),
    })
  }
}

export async function generateCircleRoundOff() {
  await copyFiles()
  // we need to execute 'off' first, in order to correctly handle 'circle-off'
  await Promise.all(types.map((type) => mutate(type, 'off')))
  await Promise.all(
    types.map((type) =>
      (['circle', 'circle-filled', 'circle-off'] as const).map((wrap) => mutate(type, wrap)),
    ),
  )
}
