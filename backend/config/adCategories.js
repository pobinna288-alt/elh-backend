const AD_CATEGORIES = Object.freeze([
  { id: 1, name: "E-commerce" },
  { id: 2, name: "Finance" },
  { id: 3, name: "Crypto" },
  { id: 4, name: "Education" },
  { id: 5, name: "Health" },
  { id: 6, name: "Real Estate" },
  { id: 7, name: "Technology" },
  { id: 8, name: "Entertainment" },
  { id: 9, name: "Jobs" },
  { id: 10, name: "Services" },
  { id: 11, name: "Others" },
]);

function normalizeCategoryKey(value) {
  return `${value ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_LOOKUP = new Map();

for (const category of AD_CATEGORIES) {
  CATEGORY_LOOKUP.set(String(category.id), category);
  CATEGORY_LOOKUP.set(normalizeCategoryKey(category.name), category);
}

function getAllAdCategories() {
  return AD_CATEGORIES.map(category => ({ ...category }));
}

function findAdCategoryById(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    return null;
  }

  const numericId = Number.parseInt(categoryId, 10);
  if (!Number.isInteger(numericId)) {
    return null;
  }

  return CATEGORY_LOOKUP.get(String(numericId)) || null;
}

function findAdCategory(categoryValue) {
  if (categoryValue === undefined || categoryValue === null || categoryValue === "") {
    return null;
  }

  return findAdCategoryById(categoryValue) || CATEGORY_LOOKUP.get(normalizeCategoryKey(categoryValue)) || null;
}

module.exports = {
  AD_CATEGORIES,
  getAllAdCategories,
  findAdCategory,
  findAdCategoryById,
  normalizeCategoryKey,
};
