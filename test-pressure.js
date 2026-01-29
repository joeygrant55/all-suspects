/**
 * Quick test of the new pressure system
 * Run with: node test-pressure.js
 */

// Simulate the pressure analysis logic
const PRESSURE_CONFIG = {
  perConfrontation: 8,
  perPointedQuestion: 12,
  perDirectAccusation: 20,
}

const POINTED_QUESTION_KEYWORDS = [
  'lie', 'lying', 'liar', 'truth', 'really', 'actually', 'honestly',
  'convenient', 'suspicious', 'strange', 'odd', 'coincidence',
  'why did you', 'explain why', 'how could you', 'prove it',
  'don\'t believe', 'impossible', 'contradict',
  'motive', 'reason to kill', 'benefit', 'inherit', 'will', 'money',
  'debt', 'owe', 'financial', 'desperate',
  'alibi', 'where were you', 'what were you doing', 'who saw you',
  'witness', 'confirm', 'verify',
  'affair', 'secret', 'hiding', 'relationship with', 'argue', 'fight',
  'hate', 'angry', 'threatened',
  'evidence', 'proof', 'found', 'discovered', 'blood', 'weapon',
  'fingerprint', 'witness saw',
]

function analyzeQuestionAggressiveness(question) {
  const lowerQuestion = question.toLowerCase()
  
  // Direct accusations (highest pressure)
  if (
    lowerQuestion.includes('you killed') ||
    lowerQuestion.includes('you murdered') ||
    lowerQuestion.includes('you\'re the killer') ||
    lowerQuestion.includes('you are guilty') ||
    lowerQuestion.includes('you did it') ||
    lowerQuestion.includes('you\'re lying')
  ) {
    return PRESSURE_CONFIG.perDirectAccusation
  }
  
  // Count pointed keywords
  const pointedKeywordCount = POINTED_QUESTION_KEYWORDS.filter(keyword =>
    lowerQuestion.includes(keyword)
  ).length
  
  if (pointedKeywordCount >= 3) {
    return PRESSURE_CONFIG.perPointedQuestion + 5
  } else if (pointedKeywordCount >= 2) {
    return PRESSURE_CONFIG.perPointedQuestion + 3
  } else if (pointedKeywordCount >= 1) {
    return PRESSURE_CONFIG.perPointedQuestion
  }
  
  return PRESSURE_CONFIG.perConfrontation
}

function convertToFrontend(backendPressure) {
  if (backendPressure <= 15) return { level: 1, label: 'Calm', color: 'green' }
  if (backendPressure <= 35) return { level: 2, label: 'Uneasy', color: 'yellow' }
  if (backendPressure <= 60) return { level: 3, label: 'Stressed', color: 'orange' }
  if (backendPressure <= 80) return { level: 4, label: 'Rattled', color: 'red' }
  return { level: 5, label: 'Breaking', color: 'red-intense' }
}

// Test scenarios
console.log('🧪 PRESSURE SYSTEM TEST\n')
console.log('=' .repeat(60))

const testQuestions = [
  // Casual questions
  { q: "How are you feeling?", expected: "casual" },
  { q: "Tell me about the party", expected: "casual" },
  { q: "What time did you arrive?", expected: "casual" },
  
  // Pointed questions (single keyword)
  { q: "Tell me about your debt to Edmund", expected: "pointed" },
  { q: "What is your alibi?", expected: "pointed" },
  { q: "Did you have a motive?", expected: "pointed" },
  
  // Pointed questions (multiple keywords)
  { q: "Why did you argue about the will?", expected: "very-pointed" },
  { q: "Your alibi doesn't add up - where were you really?", expected: "very-pointed" },
  { q: "You were desperate for money and you knew about the will changes", expected: "very-pointed" },
  
  // Direct accusations
  { q: "You killed Edmund!", expected: "accusation" },
  { q: "I think you're lying about everything", expected: "accusation" },
  { q: "You murdered him for the inheritance!", expected: "accusation" },
]

let totalPressure = 0

testQuestions.forEach((test, idx) => {
  const pressure = analyzeQuestionAggressiveness(test.q)
  totalPressure += pressure
  const frontend = convertToFrontend(totalPressure)
  
  console.log(`\nQ${idx + 1}: "${test.q}"`)
  console.log(`   Pressure: +${pressure} (Total: ${totalPressure})`)
  console.log(`   Meter: ${frontend.level}/5 - ${frontend.label} (${frontend.color})`)
})

console.log('\n' + '='.repeat(60))
console.log('\n📊 SCENARIO SUMMARY:\n')

// Scenario 1: Casual conversation
console.log('Scenario 1: Casual Conversation')
let pressure = 0
pressure += analyzeQuestionAggressiveness("How are you feeling?")
console.log(`  After Q1: ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label}`)
pressure += analyzeQuestionAggressiveness("Tell me about the party")
console.log(`  After Q2: ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label}`)
pressure += analyzeQuestionAggressiveness("What time did you arrive?")
console.log(`  After Q3: ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label} ✨`)

// Scenario 2: Pointed questioning (playtesting scenario)
console.log('\nScenario 2: Pointed Questioning (Playtest Scenario)')
pressure = 0
pressure += analyzeQuestionAggressiveness("Tell me about your debt to Edmund")
console.log(`  After Q1 (debt): ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label} ✨`)
pressure += analyzeQuestionAggressiveness("Why did you argue about the will?")
console.log(`  After Q2 (will): ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label}`)
pressure += analyzeQuestionAggressiveness("Where were you at midnight? Your alibi doesn't add up")
console.log(`  After Q3 (alibi): ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label} ✨✨`)

// Scenario 3: Aggressive confrontation
console.log('\nScenario 3: Aggressive Confrontation')
pressure = 0
pressure += analyzeQuestionAggressiveness("I know you're lying about the will")
console.log(`  After Q1: ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label}`)
pressure += analyzeQuestionAggressiveness("You were desperate for money, weren't you?")
console.log(`  After Q2: ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label} ✨`)
pressure += analyzeQuestionAggressiveness("You killed Edmund for the inheritance!")
console.log(`  After Q3 (accusation): ${pressure} → ${convertToFrontend(pressure).level}/5 ${convertToFrontend(pressure).label} ✨✨✨`)

console.log('\n' + '='.repeat(60))
console.log('✅ Test complete - pressure system is more responsive!')
