export const ANALOGIES = {
  api: {
    is: "Eins og þjónn á veitingastað: þú pantar, hann fer í eldhúsið og kemur með matinn til baka.",
    en: "Like a waiter at a restaurant: you order, they go to the kitchen, and bring the food back to you."
  },
  database: {
    is: "Eins og Excel tafla — en þá sem fleiri geta náð í á sama tíma.",
    en: "Like an Excel spreadsheet — but one that many people can access at the same time."
  },
  components: {
    is: "Eins og Lego kubbar. Þú smíðar einn kubb (t.d. takka) og getur svo notað hann aftur og aftur án þess að þurfa að smíða hann upp á nýtt.",
    en: "Like Lego bricks. You build one brick (e.g., a button) and can use it over and over without rebuilding it."
  },
  state: {
    is: "Eins og skammtímaminnið í forritinu þínu. Það man hvort takkinn hafi verið ýtt á eða hvað þú skrifaðir í textaboxið.",
    en: "Like the short-term memory of your app. It remembers if a button was clicked or what you typed in a box."
  },
  props: {
    is: "Eins og skilaboð sem þú lætur vin þinn hafa þegar þú biður hann um að gera eitthvað fyrir þig.",
    en: "Like a message you pass to a friend when you ask them to do something for you."
  }
};

export const getAnalogy = (concept: keyof typeof ANALOGIES, locale: 'is' | 'en') => {
  return ANALOGIES[concept] ? ANALOGIES[concept][locale] : "";
};
