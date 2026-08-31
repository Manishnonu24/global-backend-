// src/data/quizzes.js
// Static quiz definitions for the wellness quiz feature.
// Each quiz has a slug, metadata, and an array of questions.
// FREE_LIMIT controls how many questions are accessible without login.

export const FREE_QUESTION_LIMIT = 2;

export const quizzes = [
  {
    slug: 'general-wellness',
    title: 'General Wellness Quiz',
    subtitle: 'Evaluate your overall health habits',
    category: 'Wellness',
    categoryColor: '#0f7c85',
    categoryBg: '#f0fdfd',
    icon: '✨',
    img: '/images/holistic.webp',
    estimatedMinutes: 4,
    questionCount: 8,
    difficulty: 'Beginner',
    description:
      'A quick assessment to evaluate your daily physical activity, hydration, hydration consistency, and overall lifestyle balance.',
    questions: [
      {
        id: 1,
        text: 'How many glasses of water do you drink on average each day?',
        options: [
          { label: 'Less than 4 glasses', score: 0 },
          { label: '4–6 glasses', score: 1 },
          { label: '7–9 glasses', score: 3 },
          { label: '10 or more glasses', score: 2 },
        ],
      },
      {
        id: 2,
        text: 'How often do you engage in physical exercise or active movement?',
        options: [
          { label: 'Rarely or never', score: 0 },
          { label: '1–2 times a week', score: 1 },
          { label: '3–4 times a week', score: 3 },
          { label: 'Every day', score: 2 },
        ],
      },
      {
        id: 3,
        text: 'Do you make time for hobbies, relaxation, or self-care daily?',
        options: [
          { label: 'No, my days are too busy', score: 0 },
          { label: 'Occasionally when I have time', score: 1 },
          { label: 'Yes, at least 15-30 minutes', score: 3 },
          { label: 'Yes, multiple hours a day', score: 2 },
        ],
      },
      {
        id: 4,
        text: 'How often do you consume fresh fruits or green vegetables?',
        options: [
          { label: 'Rarely', score: 0 },
          { label: 'A few times a week', score: 1 },
          { label: 'Daily', score: 3 },
          { label: 'With every meal', score: 2 },
        ],
      },
      {
        id: 5,
        text: 'How would you rate your overall daily energy level?',
        options: [
          { label: 'Usually exhausted', score: 0 },
          { label: 'Fluctuates throughout the day', score: 1 },
          { label: 'Mostly stable and energetic', score: 3 },
          { label: 'Consistently very high', score: 2 },
        ],
      },
      {
        id: 6,
        text: 'How much screen time do you average daily outside of work?',
        options: [
          { label: 'More than 6 hours', score: 0 },
          { label: '4–6 hours', score: 1 },
          { label: '2–4 hours', score: 3 },
          { label: 'Less than 2 hours', score: 2 },
        ],
      },
      {
        id: 7,
        text: 'How often do you take short walks or stretch breaks during long tasks?',
        options: [
          { label: 'Never — I sit straight through', score: 0 },
          { label: 'Rarely', score: 1 },
          { label: 'Occasionally when stiff', score: 2 },
          { label: 'Regularly every 1-2 hours', score: 3 },
        ],
      },
      {
        id: 8,
        text: 'Which best describes your average sleep duration on weeknights?',
        options: [
          { label: 'Less than 5 hours', score: 0 },
          { label: '5–6 hours', score: 1 },
          { label: '7–8 hours', score: 3 },
          { label: 'More than 8 hours', score: 2 },
        ],
      },
    ],
    scoring: [
      { min: 0, max: 8, label: 'Needs Focus', color: '#e05248', insight: 'Try making small changes like drinking more water or taking brief walks to boost your energy.' },
      { min: 9, max: 17, label: 'Balanced Lifestyle', color: '#f39c12', insight: 'You have good wellness habits! Focus on consistency to lock in your progress.' },
      { min: 18, max: 24, label: 'Wellness Champion', color: '#27ae60', insight: 'Outstanding! You maintain highly balanced lifestyle habits. Keep it up.' },
    ],
  },
  {
    slug: 'sleep-quality',
    title: 'Sleep Quality Assessment',
    subtitle: 'Discover how well you\'re truly sleeping',
    category: 'Sleep',
    categoryColor: '#1fb9fb',
    categoryBg: '#e8f4ff',
    icon: '🌙',
    img: '/images/mag_sleep.webp',
    estimatedMinutes: 5,
    questionCount: 10,
    difficulty: 'Beginner',
    description:
      'Assess your sleep hygiene, duration patterns, and overnight recovery quality with this clinically informed questionnaire.',
    questions: [
      {
        id: 1,
        text: 'How many hours of sleep do you typically get on weeknights?',
        options: [
          { label: 'Less than 5 hours', score: 0 },
          { label: '5–6 hours', score: 1 },
          { label: '7–8 hours', score: 3 },
          { label: 'More than 8 hours', score: 2 },
        ],
      },
      {
        id: 2,
        text: 'How long does it usually take you to fall asleep?',
        options: [
          { label: 'More than 45 minutes', score: 0 },
          { label: '30–45 minutes', score: 1 },
          { label: '15–30 minutes', score: 2 },
          { label: 'Less than 15 minutes', score: 3 },
        ],
      },
      {
        id: 3,
        text: 'How often do you wake up in the middle of the night?',
        options: [
          { label: 'Almost every night', score: 0 },
          { label: '3–5 nights a week', score: 1 },
          { label: '1–2 nights a week', score: 2 },
          { label: 'Rarely or never', score: 3 },
        ],
      },
      {
        id: 4,
        text: 'How do you feel when you wake up in the morning?',
        options: [
          { label: 'Exhausted, hard to get out of bed', score: 0 },
          { label: 'Groggy for 30+ minutes', score: 1 },
          { label: 'Slightly tired but functional', score: 2 },
          { label: 'Refreshed and energized', score: 3 },
        ],
      },
      {
        id: 5,
        text: 'Do you use screens (phone, TV, laptop) within 1 hour of bedtime?',
        options: [
          { label: 'Yes, every night', score: 0 },
          { label: 'Yes, most nights', score: 1 },
          { label: 'Sometimes', score: 2 },
          { label: 'Rarely or never', score: 3 },
        ],
      },
      {
        id: 6,
        text: 'How consistent is your sleep schedule (bedtime & wake time)?',
        options: [
          { label: 'Very inconsistent, varies by 3+ hours', score: 0 },
          { label: 'Somewhat inconsistent', score: 1 },
          { label: 'Mostly consistent on weekdays', score: 2 },
          { label: 'Very consistent every day', score: 3 },
        ],
      },
      {
        id: 7,
        text: 'Do you consume caffeine after 2 PM?',
        options: [
          { label: 'Yes, every day', score: 0 },
          { label: 'Yes, often', score: 1 },
          { label: 'Occasionally', score: 2 },
          { label: 'Never', score: 3 },
        ],
      },
      {
        id: 8,
        text: 'How is your bedroom environment?',
        options: [
          { label: 'Bright, noisy, and warm', score: 0 },
          { label: 'Slightly bright or noisy', score: 1 },
          { label: 'Mostly dark and quiet', score: 2 },
          { label: 'Dark, cool, and very quiet', score: 3 },
        ],
      },
      {
        id: 9,
        text: 'Do you experience any of the following: snoring, gasping, or restless legs?',
        options: [
          { label: 'Yes, frequently', score: 0 },
          { label: 'Sometimes', score: 1 },
          { label: 'Rarely', score: 2 },
          { label: 'Never', score: 3 },
        ],
      },
      {
        id: 10,
        text: 'How satisfied are you with your current sleep overall?',
        options: [
          { label: 'Very dissatisfied', score: 0 },
          { label: 'Somewhat dissatisfied', score: 1 },
          { label: 'Mostly satisfied', score: 2 },
          { label: 'Very satisfied', score: 3 },
        ],
      },
    ],
    scoring: [
      { min: 0, max: 10, label: 'Poor Sleep', color: '#e05248', insight: 'Your sleep health needs immediate attention. Consider a sleep specialist consultation.' },
      { min: 11, max: 19, label: 'Fair Sleep', color: '#f39c12', insight: 'Your sleep has room for improvement. Focus on consistent sleep schedules and reducing screen time.' },
      { min: 20, max: 25, label: 'Good Sleep', color: '#27ae60', insight: 'You have solid sleep habits. Small optimizations can help you reach excellent sleep quality.' },
      { min: 26, max: 30, label: 'Excellent Sleep', color: '#0f7c85', insight: 'Your sleep is outstanding! Keep maintaining these healthy habits.' },
    ],
  },
  {
    slug: 'stress-burnout',
    title: 'Stress & Burnout Check',
    subtitle: 'Understand your stress load and resilience',
    category: 'Mental Health',
    categoryColor: '#8e44ad',
    categoryBg: '#f3eeff',
    icon: '🧠',
    img: '/images/mag_detox.webp',
    estimatedMinutes: 6,
    questionCount: 10,
    difficulty: 'Intermediate',
    description:
      'Evaluate your daily stress patterns, emotional resilience, and risk of burnout with this evidence-based assessment.',
    questions: [
      {
        id: 1,
        text: 'How often do you feel overwhelmed by your daily responsibilities?',
        options: [
          { label: 'Almost always', score: 0 },
          { label: 'Often', score: 1 },
          { label: 'Sometimes', score: 2 },
          { label: 'Rarely or never', score: 3 },
        ],
      },
      {
        id: 2,
        text: 'How would you rate your ability to "switch off" from work after hours?',
        options: [
          { label: 'I cannot switch off at all', score: 0 },
          { label: 'Very difficult', score: 1 },
          { label: 'Moderately able', score: 2 },
          { label: 'I switch off easily', score: 3 },
        ],
      },
      {
        id: 3,
        text: 'Do you experience physical symptoms of stress (headaches, tight muscles, fatigue)?',
        options: [
          { label: 'Daily', score: 0 },
          { label: 'Several times a week', score: 1 },
          { label: 'Occasionally', score: 2 },
          { label: 'Rarely', score: 3 },
        ],
      },
      {
        id: 4,
        text: 'How often do you take breaks during your workday?',
        options: [
          { label: 'Never — I work straight through', score: 0 },
          { label: 'Only when forced to', score: 1 },
          { label: 'A few intentional breaks', score: 2 },
          { label: 'Regular scheduled breaks', score: 3 },
        ],
      },
      {
        id: 5,
        text: 'How would you describe your emotional state most days?',
        options: [
          { label: 'Anxious or irritable', score: 0 },
          { label: 'Flat or unmotivated', score: 1 },
          { label: 'Neutral but manageable', score: 2 },
          { label: 'Calm and positive', score: 3 },
        ],
      },
      {
        id: 6,
        text: 'Do you have activities outside work that help you recharge?',
        options: [
          { label: 'No — I have no time or energy', score: 0 },
          { label: 'Rarely', score: 1 },
          { label: 'Sometimes', score: 2 },
          { label: 'Yes, regularly', score: 3 },
        ],
      },
      {
        id: 7,
        text: 'How supported do you feel by people around you (family, friends, colleagues)?',
        options: [
          { label: 'Not supported at all', score: 0 },
          { label: 'Mostly unsupported', score: 1 },
          { label: 'Somewhat supported', score: 2 },
          { label: 'Very well supported', score: 3 },
        ],
      },
      {
        id: 8,
        text: 'How is your appetite and eating pattern under stress?',
        options: [
          { label: 'I skip meals or overeat heavily', score: 0 },
          { label: 'Noticeably affected', score: 1 },
          { label: 'Slightly affected', score: 2 },
          { label: 'No change — stays consistent', score: 3 },
        ],
      },
      {
        id: 9,
        text: 'Do you practice any form of mindfulness, meditation, or relaxation technique?',
        options: [
          { label: "Never — don't know how", score: 0 },
          { label: 'Rarely', score: 1 },
          { label: 'Sometimes', score: 2 },
          { label: 'Daily practice', score: 3 },
        ],
      },
      {
        id: 10,
        text: 'Overall, how would you rate your mental wellness this past month?',
        options: [
          { label: 'Very poor', score: 0 },
          { label: 'Poor', score: 1 },
          { label: 'Fair', score: 2 },
          { label: 'Good to excellent', score: 3 },
        ],
      },
    ],
    scoring: [
      { min: 0, max: 10, label: 'High Burnout Risk', color: '#e05248', insight: 'You show significant signs of burnout. Please consider speaking with a mental health professional.' },
      { min: 11, max: 19, label: 'Moderate Stress', color: '#f39c12', insight: "Your stress levels are elevated. Incorporating regular mindfulness and boundary-setting can help." },
      { min: 20, max: 25, label: 'Manageable Stress', color: '#27ae60', insight: "You're managing stress reasonably well. Focus on maintaining your coping strategies." },
      { min: 26, max: 30, label: 'Resilient & Thriving', color: '#0f7c85', insight: 'Excellent mental resilience! You have great stress management habits in place.' },
    ],
  },
  {
    slug: 'nutrition-gut',
    title: 'Nutrition & Gut Health Quiz',
    subtitle: 'Evaluate your dietary habits and digestive wellness',
    category: 'Nutrition',
    categoryColor: '#f39c12',
    categoryBg: '#fff8e8',
    icon: '🥗',
    img: '/images/mag_nutrition.webp',
    estimatedMinutes: 5,
    questionCount: 10,
    difficulty: 'Beginner',
    description:
      'Assess the quality of your diet, your gut microbiome health indicators, and how your food choices impact your long-term wellness.',
    questions: [
      {
        id: 1,
        text: 'How many servings of fruits and vegetables do you eat daily?',
        options: [
          { label: '0–1 servings', score: 0 },
          { label: '2–3 servings', score: 1 },
          { label: '4–5 servings', score: 2 },
          { label: '6+ servings', score: 3 },
        ],
      },
      {
        id: 2,
        text: 'How often do you eat ultra-processed foods (fast food, packaged snacks, sugary drinks)?',
        options: [
          { label: 'Multiple times a day', score: 0 },
          { label: 'Once a day', score: 1 },
          { label: 'A few times a week', score: 2 },
          { label: 'Rarely or never', score: 3 },
        ],
      },
      {
        id: 3,
        text: 'How much water do you drink daily?',
        options: [
          { label: 'Less than 1 litre', score: 0 },
          { label: '1–1.5 litres', score: 1 },
          { label: '1.5–2.5 litres', score: 2 },
          { label: '2.5+ litres', score: 3 },
        ],
      },
      {
        id: 4,
        text: 'Do you eat fermented or probiotic foods (yogurt, kefir, kimchi, idli)?',
        options: [
          { label: 'Never', score: 0 },
          { label: 'Rarely', score: 1 },
          { label: 'A few times a week', score: 2 },
          { label: 'Daily', score: 3 },
        ],
      },
      {
        id: 5,
        text: 'How would you describe your digestion?',
        options: [
          { label: 'Frequent bloating, gas, or discomfort', score: 0 },
          { label: 'Occasional issues', score: 1 },
          { label: 'Mostly fine', score: 2 },
          { label: 'No issues — regular and comfortable', score: 3 },
        ],
      },
      {
        id: 6,
        text: 'How often do you eat meals at consistent times each day?',
        options: [
          { label: 'Never — very irregular', score: 0 },
          { label: 'Sometimes', score: 1 },
          { label: 'Mostly consistent', score: 2 },
          { label: 'Always consistent meal times', score: 3 },
        ],
      },
      {
        id: 7,
        text: 'Do you read ingredient labels when buying packaged foods?',
        options: [
          { label: 'Never', score: 0 },
          { label: 'Rarely', score: 1 },
          { label: 'Sometimes for key items', score: 2 },
          { label: 'Always — I make informed choices', score: 3 },
        ],
      },
      {
        id: 8,
        text: 'How much fibre-rich food (legumes, wholegrains, seeds) do you include in your diet?',
        options: [
          { label: 'Very little or none', score: 0 },
          { label: 'Small amounts', score: 1 },
          { label: 'A moderate amount', score: 2 },
          { label: 'High-fibre diet', score: 3 },
        ],
      },
      {
        id: 9,
        text: 'Do you take any supplements or vitamins regularly?',
        options: [
          { label: "No, and I don't think I need any", score: 0 },
          { label: 'No, but I know I should', score: 1 },
          { label: 'Yes, some occasionally', score: 2 },
          { label: 'Yes, a researched daily regimen', score: 3 },
        ],
      },
      {
        id: 10,
        text: 'How satisfied are you with your current eating habits overall?',
        options: [
          { label: 'Very dissatisfied', score: 0 },
          { label: 'Somewhat dissatisfied', score: 1 },
          { label: 'Mostly satisfied', score: 2 },
          { label: 'Very satisfied', score: 3 },
        ],
      },
    ],
    scoring: [
      { min: 0, max: 10, label: 'Needs Improvement', color: '#e05248', insight: 'Your nutritional habits need significant changes. Consider consulting a registered dietitian.' },
      { min: 11, max: 19, label: 'Room to Grow', color: '#f39c12', insight: "Some good habits exist, but there's clear room for improvement in your diet quality." },
      { min: 20, max: 25, label: 'Healthy Eater', color: '#27ae60', insight: 'You make mostly good food choices. Focus on consistency to maximise long-term benefits.' },
      { min: 26, max: 30, label: 'Nutrition Champion', color: '#0f7c85', insight: 'Excellent nutritional awareness and habits! You are fuelling your body optimally.' },
    ],
  },
  {
    slug: 'dosha-body-type',
    title: 'Ayurvedic Dosha Discovery',
    subtitle: 'Find your unique mind-body constitution',
    category: 'Ayurveda',
    categoryColor: '#27ae60',
    categoryBg: '#e8f8f0',
    icon: '🌿',
    img: '/images/ayurveda.webp',
    estimatedMinutes: 7,
    questionCount: 10,
    difficulty: 'Intermediate',
    description:
      'Discover your Ayurvedic constitution (Vata, Pitta, or Kapha) and receive personalised lifestyle and dietary recommendations.',
    questions: [
      {
        id: 1,
        text: 'How would you describe your body frame?',
        options: [
          { label: 'Thin, light, irregular — hard to gain weight (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Medium, muscular, well-proportioned (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Broad, solid, gains weight easily (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: "Mixed — doesn't fit one description", score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 2,
        text: 'How is your skin typically?',
        options: [
          { label: 'Dry, rough, or flaky (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Oily, sensitive, prone to redness (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Smooth, moist, thick (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: 'Combination or varies', score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 3,
        text: 'How do you handle stress?',
        options: [
          { label: 'I get anxious, overthink, feel scattered (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'I get irritable, critical, or intense (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'I withdraw, get slow, or stubborn (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: 'A mix of the above', score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 4,
        text: 'How is your sleep pattern?',
        options: [
          { label: 'Light sleeper, trouble staying asleep (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Moderate sleeper, vivid dreams (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Heavy sleeper, hard to wake up (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: 'Varies a lot', score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 5,
        text: 'How would you describe your appetite?',
        options: [
          { label: 'Variable — sometimes hungry, sometimes not (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Strong and sharp — I get very hungry (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Steady but can skip meals easily (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: "None of the above fits well", score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 6,
        text: 'What climate do you prefer?',
        options: [
          { label: 'Warm and humid — cold bothers me (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Cool and well-ventilated (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Warm and dry — dislike cold and damp (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: 'Adaptable to most climates', score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 7,
        text: 'How is your energy level throughout the day?',
        options: [
          { label: 'Bursts of energy followed by exhaustion (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Sustained and intense — strong drive (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Slow to start, steady and enduring (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: 'Fluctuates a lot', score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 8,
        text: 'How do you learn and retain new information?',
        options: [
          { label: 'Quick to learn, quick to forget (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Focused, methodical learner (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Slow to learn, but retains well (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: 'Varies by topic', score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 9,
        text: 'How would your friends describe your personality?',
        options: [
          { label: 'Creative, enthusiastic, changeable (Vata)', score: { v: 3, p: 0, k: 0 } },
          { label: 'Driven, confident, sometimes intense (Pitta)', score: { v: 0, p: 3, k: 0 } },
          { label: 'Calm, loyal, nurturing, grounded (Kapha)', score: { v: 0, p: 0, k: 3 } },
          { label: "Hard to put in one category", score: { v: 1, p: 1, k: 1 } },
        ],
      },
      {
        id: 10,
        text: 'How often do you feel genuinely at peace and balanced?',
        options: [
          { label: 'Rarely — I feel scattered or restless', score: { v: 3, p: 0, k: 0 } },
          { label: 'Sometimes — when I achieve my goals', score: { v: 0, p: 3, k: 0 } },
          { label: "Often — I'm naturally easy-going", score: { v: 0, p: 0, k: 3 } },
          { label: 'Hard to say', score: { v: 1, p: 1, k: 1 } },
        ],
      },
    ],
    scoring: [
      { dosha: 'Vata', color: '#8e44ad', insight: 'You are primarily Vata. You thrive on warm, nourishing foods, grounding routines, and calming practices like yoga and meditation.' },
      { dosha: 'Pitta', color: '#e05248', insight: 'You are primarily Pitta. Cool, calming foods and activities help you stay balanced. Avoid excessive heat and overwork.' },
      { dosha: 'Kapha', color: '#0f7c85', insight: "You are primarily Kapha. Stimulating exercise, light foods, and variety in your routine help keep Kapha in balance." },
      { dosha: 'Tridoshic', color: '#27ae60', insight: 'You are Tridoshic — a rare and balanced constitution. Focus on seasonal adjustments to maintain your natural harmony.' },
    ],
  },
];

export function getQuizBySlug(slug) {
  return quizzes.find((q) => q.slug === slug) || null;
}
