export interface DoshaAnswer {
  text: string;
  dosha: "vata" | "pitta" | "kapha";
  points: number;
}

export interface DoshaQuestion {
  id: number;
  questionMl: string;
  questionEn: string;
  answers: DoshaAnswer[];
}

export const doshaQuestions: DoshaQuestion[] = [
  {
    id: 1,
    questionMl: "നിങ്ങളുടെ ശരീരത്തിന്റെ വേഷം എങ്ങനെയാണ്?",
    questionEn: "What is your body frame?",
    answers: [
      { text: "മെലിഞ്ഞ, ഭാരം കുറഞ്ഞ (Slim, light)", dosha: "vata", points: 3 },
      { text: "മിതമായ, പേശീയുള്ള (Medium, muscular)", dosha: "pitta", points: 3 },
      { text: "ദൃഢമായ, ഭാരം കൂടിയ (Sturdy, heavier)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 2,
    questionMl: "നിങ്ങളുടെ ചർമ്മത്തിന്റെ സ്വഭാവം?",
    questionEn: "What is your skin type?",
    answers: [
      { text: "വരണ്ട, മെലിഞ്ഞ (Dry, thin)", dosha: "vata", points: 3 },
      { text: "സൂക്ഷ്മത, പിരിമുറുക്കമുള്ള (Sensitive, prone to acne)", dosha: "pitta", points: 3 },
      { text: "കട, മികച്ച (Thick, oily)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 3,
    questionMl: "നിങ്ങളുടെ ദഹന ശേഷി?",
    questionEn: "What is your digestion like?",
    answers: [
      { text: "അസ്ഥിരം, വ്യത്യസ്തമായ (Irregular, variable)", dosha: "vata", points: 3 },
      { text: "ശക്തിയുള്ള, കുറ്റനിരോധകമായ (Strong, quick)", dosha: "pitta", points: 3 },
      { text: "സ്ഥിരം, നിശ്ശബ്ദം (Slow, steady)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 4,
    questionMl: "നിങ്ങളുടെ ശരീരത്തിന്റെ താപനില?",
    questionEn: "How is your body temperature?",
    answers: [
      { text: "പലപ്പോഴും തണുപ്പ് (Often cold)", dosha: "vata", points: 3 },
      { text: "സാധാരണ ഊഷ്ണം (Naturally warm)", dosha: "pitta", points: 3 },
      { text: "സ്ഥിരമായ, ചെറുതായി തണുപ്പ് (Stable, slightly cool)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 5,
    questionMl: "നിങ്ങളുടെ ഉദ്ദേശ്യം എങ്ങനെയാണ്?",
    questionEn: "What is your energy level like?",
    answers: [
      { text: "ഉയർന്നത്, പതിനിഴിയുന്നത് (High, fluctuating)", dosha: "vata", points: 3 },
      { text: "മിതമായ, ലക്ഷ്യാധിഷ്ഠിതം (Moderate, focused)", dosha: "pitta", points: 3 },
      { text: "സ്ഥിരം, സ്ഥിര (Steady, consistent)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 6,
    questionMl: "നിങ്ങളുടെ ഉറങ്ങൽ പാറ്റേൺ?",
    questionEn: "What is your sleep pattern?",
    answers: [
      { text: "നിർബന്ധമായ, പലപ്പോഴും കുറഞ്ഞ (Light, often insufficient)", dosha: "vata", points: 3 },
      { text: "മോഡറേറ്റ്, കെടിയുന്ന (Moderate, can be interrupted)", dosha: "pitta", points: 3 },
      { text: "ഗഹിരം, ദീർഘ (Deep, long)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 7,
    questionMl: "നിങ്ങളുടെ ബുദ്ധിമത്ത കര്യ അംഗീകാരം?",
    questionEn: "How is your memory and learning?",
    answers: [
      { text: "വേഗതയുള്ള, ചിന്താശൂന്യമായ (Quick, forgetful)", dosha: "vata", points: 3 },
      { text: "കൂർവ്യമായ ബുദ്ധി (Sharp intellect)", dosha: "pitta", points: 3 },
      { text: "കരുതലുള്ള, ദീർഘ ഓർമ്മ (Methodical, long-term memory)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 8,
    questionMl: "നിങ്ങളുടെ ഭാവന പ്രവണത?",
    questionEn: "What is your emotional nature?",
    answers: [
      { text: "നിരന്തരം ആശങ്കാകുലമായ (Anxious, restless)", dosha: "vata", points: 3 },
      { text: "തീവ്രമായ, നിയന്ത്രണ ഇഷ്ടമായ (Intense, controlling)", dosha: "pitta", points: 3 },
      { text: "പശ്ചാത്താപമായ, സ്ഥിരമായ (Content, stable)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 9,
    questionMl: "നിങ്ങൾ കാണുന്ന ഭക്ഷണ വിധി?",
    questionEn: "What foods do you prefer?",
    answers: [
      { text: "ഭക്ഷണത്തിന്റെ വൈവിധ്യം, ഹ്രസ്വ (Light, varied)", dosha: "vata", points: 3 },
      { text: "ശൈത്യ, സ്നേഹിത ഖരും ഘനീഭൂത (Cool, spicy foods)", dosha: "pitta", points: 3 },
      { text: "കൂടുതൽ, കൃത്യം സമയം (Hearty, regular meals)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 10,
    questionMl: "നിങ്ങളുടെ ശാരീരിക ശോഷണ?",
    questionEn: "How is your physical endurance?",
    answers: [
      { text: "അല്പ, വേഗതയുള്ള (Low, quick bursts)", dosha: "vata", points: 3 },
      { text: "മിതമായ, കടുത്ത സ്ഥിരതയുള്ള (Moderate, intense but steady)", dosha: "pitta", points: 3 },
      { text: "ഉയർന്ന, ദീർഘ (High, long-lasting)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 11,
    questionMl: "നിങ്ങളുടെ ശരണ ഭാഷണ ശൈലി?",
    questionEn: "How do you typically speak?",
    answers: [
      { text: "വേഗത, കൂടുതൽ സംസാരം (Fast, talkative)", dosha: "vata", points: 3 },
      { text: "ശരിയായ, കാര്യക്ഷമമായ (Precise, direct)", dosha: "pitta", points: 3 },
      { text: "നിശ്ശബ്ദം, വിചാരശീലമായ (Calm, thoughtful)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 12,
    questionMl: "നിങ്ങളുടെ സാധാരണ കൃതികൾ?",
    questionEn: "What types of activities do you enjoy?",
    answers: [
      { text: "ഒപ്പടച്ചതായ, വിനോദ (Creative, play)", dosha: "vata", points: 3 },
      { text: "തന്നത്തീർതതായ, സ്പർധാപ്രായ (Competitive, challenging)", dosha: "pitta", points: 3 },
      { text: "ചിത്രീകരണ, സംഘ പ്രവർത്തനങ്ങൾ (Social, group activities)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 13,
    questionMl: "നിങ്ങളുടെ സ്വാഭാവിക കൗതുകം എങ്ങനെയാണ്?",
    questionEn: "What is your reaction to stress?",
    answers: [
      { text: "ഭയം, ആശങ്കമയം (Nervous, worried)", dosha: "vata", points: 3 },
      { text: "കോപം, നാറുന്ന (Irritated, angry)", dosha: "pitta", points: 3 },
      { text: "അവിഷ്കാരം, അപ്രവർത്തനം (Withdrawn, unmotivated)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 14,
    questionMl: "നിങ്ങളുടെ സാധാരണ വിരഹിത ശോധനം?",
    questionEn: "How do you prefer to spend leisure time?",
    answers: [
      { text: "പര്യടനം, പുതിയ അനുഭവങ്ങൾ (Travel, new experiences)", dosha: "vata", points: 3 },
      { text: "കൃതിത്വം, വായന (Reading, learning)", dosha: "pitta", points: 3 },
      { text: "വിശ്രാമം, കുടുംബ സമയം (Relaxation, family time)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 15,
    questionMl: "നിങ്ങളുടെ സ്കന്ദാങ്ങൾ നിയമിതമായ ഉപയോഗം?",
    questionEn: "How is your appetite regularity?",
    answers: [
      { text: "ക്ഷണികമായ, ഉത്തേജ്യ (Variable, erratic)", dosha: "vata", points: 3 },
      { text: "ശക്തിയുള്ള, സ്ഥിരമായ (Strong, consistent)", dosha: "pitta", points: 3 },
      { text: "സ്ഥിരം, സാവധാനം വർദ്ധനം (Slow, steady)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 16,
    questionMl: "നിങ്ങളുടെ ആഭ്യന്തര തന്മാത്ര ധാരണ?",
    questionEn: "What is your pain tolerance?",
    answers: [
      { text: "കുറഞ്ഞ, സംവേദനശീലം (Low, sensitive)", dosha: "vata", points: 3 },
      { text: "മിതമായ, എളുപ്പം കോപിപ്പെടുന്ന (Moderate, intolerant)", dosha: "pitta", points: 3 },
      { text: "ഉയർന്ന, സഹിഷ്ണു (High, tolerant)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 17,
    questionMl: "നിങ്ങളുടെ ആന്തരിക കാലഘട്ടം?",
    questionEn: "How do you respond to seasonal changes?",
    answers: [
      { text: "വേഗ മാറ്റങ്ങൾ, അസ്ഥിരത (Quick changes, imbalance)", dosha: "vata", points: 3 },
      { text: "മായ ബാധ, സൂര്യ സംവേദനം (Skin issues in summer)", dosha: "pitta", points: 3 },
      { text: "ജലസ്വരം, കുറ്റി വീക്ഷണം (Heaviness, congestion)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 18,
    questionMl: "നിങ്ങളുടെ സാമാന്യ മാനസിക ദിശ?",
    questionEn: "What is your typical mindset?",
    answers: [
      { text: "സ്പർശിത, കരുതൽ ഇല്ലാത്ത (Scattered, carefree)", dosha: "vata", points: 3 },
      { text: "കേന്ദ്രീകൃത, ലക്ഷ്യാധിഷ്ഠിത (Focused, ambitious)", dosha: "pitta", points: 3 },
      { text: "സമതുലിത, സമാധാനപ്പെട്ട (Balanced, content)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 19,
    questionMl: "നിങ്ങളുടെ സംഖ്യാ ശരീരാകാരം?",
    questionEn: "How easily do you gain or lose weight?",
    answers: [
      { text: "കഷ്ടത്തോടെ ഭാരം കൂടുന്നു (Difficulty gaining weight)", dosha: "vata", points: 3 },
      { text: "ദ്രുതമായ മാറ്റം (Quick weight changes)", dosha: "pitta", points: 3 },
      { text: "കഷ്ടത്തോടെ ഭാരം കുറയ്ക്കുന്നു (Tendency to gain weight)", dosha: "kapha", points: 3 },
    ],
  },
  {
    id: 20,
    questionMl: "ആത്മനിഷ്ഠ ഭാവത്തിന്റെ പ്രതിഫലനം?",
    questionEn: "How do you generally feel about life?",
    answers: [
      { text: "ചഞ്ചലമായ, വ്യതിരിക്ത (Changeable, scattered)", dosha: "vata", points: 3 },
      { text: "നിര്ണയമായ, വിമർശകമായ (Determined, critical)", dosha: "pitta", points: 3 },
      { text: "സന്തോഷപ്പെട്ട, സ്ഥിരം (Contented, stable)", dosha: "kapha", points: 3 },
    ],
  },
];

export const doshaDescriptions = {
  vata: {
    ml: "വായു ഘടകം - സൃജനാത്മകം, സജീവം, ദ്രുതചിന്താ",
    en: "Air element - Creative, active, quick-thinking",
    recommendations: {
      foods: ["따뜻한എണ്ണ", "വേരുപരിപ്പ്", "അരിസ്", "നട്ടുകുതിരകൾ"],
      activities: ["സാധാരണ യോഗ", "ധ്യാനം", "സൂക്ഷ്മ പ്രാകൃതിക പ്രവർത്തനം"],
      season: "ശീതകാലം - ഊഷ്മ പ്രാകൃതിക",
    },
  },
  pitta: {
    ml: "അഗ്നി ഘടകം - തീവ്രം, ആത്മാര്ഥ, കാര്യക്ഷമ ബുദ്ധി",
    en: "Fire element - Intense, ambitious, sharp intellect",
    recommendations: {
      foods: ["തണുപ്പ് മണ്ഡി", "ദ്രവ്യകം", "പച്ചക്കറി", "കൊക്കൊണ്ട്"],
      activities: ["നീന്തൽ", "തണുപ്പ് നടത്തം", "ചന്ദ്ര നിരീക്ഷണം"],
      season: "വേനൽക്കാലം - തണുപ്പ് പ്രാകൃതിക",
    },
  },
  kapha: {
    ml: "ഭൂമി ഘടകം - ശാന്തം, സ്ഥിരം, പരിചർജനം",
    en: "Earth element - Calm, stable, nurturing",
    recommendations: {
      foods: ["വെന്നെയ് വിളം", "ഭാരിമാനം ഭക്ഷണം", "കയ്പ് മണ്ഡി"],
      activities: ["സുഫലിത വ്യായാമം", "ഉദ്ദീപകമായ പ്രവർത്തനം"],
      season: "വസന്തകാലം - പ്രാണോദ്ബോധകമായ പ്രാകൃതിക",
    },
  },
};
