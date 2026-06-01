import { PrismaClient } from "@prisma/client";
import { SEED_CATEGORIES, ALL_SEED_SHOWCASES } from "../src/data/seed-data.js";

const prisma = new PrismaClient();

async function main() {
  // 멱등: 기존 데이터 삭제 후 재삽입
  await prisma.showcase.deleteMany();
  await prisma.category.deleteMany();

  const categoryIdBySlug = new Map<string, string>();
  for (const c of SEED_CATEGORIES) {
    const created = await prisma.category.create({
      data: { slug: c.slug, label: c.label, order: c.order },
    });
    categoryIdBySlug.set(c.slug, created.id);
  }

  for (const s of ALL_SEED_SHOWCASES) {
    const categoryId = categoryIdBySlug.get(s.category);
    if (!categoryId) throw new Error(`Unknown category slug: ${s.category}`);
    await prisma.showcase.create({
      data: {
        slug: s.slug,
        title: s.title,
        blurb: s.blurb,
        accent: s.accent,
        layout: s.layout,
        categoryId,
      },
    });
  }

  const cats = await prisma.category.count();
  const items = await prisma.showcase.count();
  console.log(`[seed] categories=${cats}, showcases=${items}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
