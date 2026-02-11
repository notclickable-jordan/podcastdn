import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  const password = await hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      password,
    },
  });

  const podcast = await prisma.podcast.upsert({
    where: { id: "demo-podcast" },
    update: {},
    create: {
      id: "demo-podcast",
      title: "My First Podcast",
      description:
        "A demo podcast created by the seed script. Add YouTube videos to get started!",
      author: "Demo User",
      userId: user.id,
    },
  });

  console.log("Seed complete:");
  console.log(`  User: ${user.email}`);
  console.log(`  Podcast: ${podcast.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
