export interface DoshaRecommendation {
  foods: string[];
  activities: string[];
  season: string;
  tips: string[];
}

export const doshaRecommendations: Record<string, DoshaRecommendation> = {
  vata: {
    foods: ["Warm oils (sesame, ghee)", "Root vegetables", "Whole grains", "Nuts and seeds", "Warming spices"],
    activities: ["Gentle yoga", "Meditation", "Tai Chi", "Warm routines", "Rest and relaxation"],
    season: "Winter - Focus on warming practices and establishing routines",
    tips: [
      "Keep a consistent daily routine (sleep, meals, work)",
      "Stay warm in cold weather",
      "Avoid excessive travel and stimulation",
      "Practice grounding activities like gardening",
      "Use warm oils for massage (abhyanga)",
    ],
  },
  pitta: {
    foods: ["Cooling herbs (mint, cilantro)", "Fresh fruits", "Green vegetables", "Coconut water", "Ghee in moderation"],
    activities: ["Swimming", "Cool walks", "Moon gazing", "Creative pursuits", "Relaxation"],
    season: "Summer - Focus on cooling practices and avoiding overexertion",
    tips: [
      "Avoid excessive heat and intense exercise",
      "Stay hydrated with cool (not cold) water",
      "Practice stress-relief techniques",
      "Eat meals at regular times",
      "Use cooling foods like cucumber and coconut",
    ],
  },
  kapha: {
    foods: ["Warming spices (ginger, cayenne)", "Light foods", "Bitter herbs", "Legumes", "Warm soups"],
    activities: ["Vigorous exercise", "Stimulating activities", "Dancing", "Social events", "Adventure"],
    season: "Spring - Focus on invigorating practices and movement",
    tips: [
      "Exercise regularly to maintain metabolism",
      "Practice dynamic yoga styles",
      "Avoid excessive sleep and rest",
      "Vary your routine to maintain stimulation",
      "Focus on light, warm meals",
    ],
  },
};
