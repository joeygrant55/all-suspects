import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface SaintMetadata {
  feastDay: string | null
  patronage: string[]
  titles: string[]
}

export interface SaintSummary extends SaintMetadata {
  id: string
  name: string
  topics: string[]
}

export interface SaintRecord extends SaintSummary {
  content: string
  filePath: string
}

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFilePath)
const saintsDirectory = path.resolve(currentDirectory, '../../saints')

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getSection(content: string, heading: string): string {
  const sectionPattern = new RegExp(
    `^##\\s+${escapeRegExp(heading)}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`,
    'm'
  )

  const match = content.match(sectionPattern)
  return match?.[1]?.trim() ?? ''
}

function getIdentityField(identitySection: string, label: string): string | null {
  const fieldPattern = new RegExp(
    `^-\\s+\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)$`,
    'mi'
  )

  const match = identitySection.match(fieldPattern)
  return match?.[1]?.trim() ?? null
}

function splitCommaSeparatedValues(value: string | null): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseTopics(content: string): string[] {
  const topicsSection = getSection(content, 'Topics and Expertise')
  if (!topicsSection) {
    return []
  }

  const topics = topicsSection
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^\*\*[^:]+:\*\*\s*(.+)$/)
      if (!match) {
        return []
      }

      return match[1]
        .split(',')
        .map((topic) => topic.trim())
        .filter(Boolean)
    })

  return Array.from(new Set(topics))
}

function parseSaint(fileName: string): SaintRecord {
  const filePath = path.join(saintsDirectory, fileName)
  const content = fs.readFileSync(filePath, 'utf8')
  const identitySection = getSection(content, 'Identity')
  const id = path.basename(fileName, '.md')
  const name =
    content
      .split(/\r?\n/)
      .find((line) => line.startsWith('# '))
      ?.replace(/^#\s+/, '')
      .trim() ?? id

  return {
    id,
    name,
    feastDay: getIdentityField(identitySection, 'Feast day'),
    patronage: splitCommaSeparatedValues(getIdentityField(identitySection, 'Patronage')),
    titles: splitCommaSeparatedValues(getIdentityField(identitySection, 'Titles')),
    topics: parseTopics(content),
    content,
    filePath,
  }
}

function loadSaints(): SaintRecord[] {
  if (!fs.existsSync(saintsDirectory)) {
    return []
  }

  return fs
    .readdirSync(saintsDirectory)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => parseSaint(fileName))
}

function toSummary(saint: SaintRecord): SaintSummary {
  return {
    id: saint.id,
    name: saint.name,
    feastDay: saint.feastDay,
    patronage: saint.patronage,
    titles: saint.titles,
    topics: saint.topics,
  }
}

export function getSaint(id: string): SaintRecord | null {
  const normalizedId = id.trim().toLowerCase()
  if (!normalizedId) {
    return null
  }

  return loadSaints().find((saint) => saint.id.toLowerCase() === normalizedId) ?? null
}

export function listSaints(): SaintSummary[] {
  return loadSaints().map((saint) => toSummary(saint))
}

export function getSaintsByTopic(topic: string): SaintSummary[] {
  const normalizedTopic = topic.trim().toLowerCase()
  if (!normalizedTopic) {
    return []
  }

  return loadSaints()
    .filter((saint) => {
      const searchableValues = [
        saint.name,
        saint.feastDay ?? '',
        saint.patronage.join(' '),
        saint.titles.join(' '),
        saint.topics.join(' '),
        saint.content,
      ]

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedTopic)
      )
    })
    .map((saint) => toSummary(saint))
}
