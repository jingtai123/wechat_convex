// scripts/importAllowedUsers.js
import dotenv from 'dotenv';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "fs";

// 加载 .env.local 配置
dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: 请在 .env.local 中设置 VITE_CONVEX_URL");
  console.error("Error: Please set VITE_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// CSV文件路径 (从命令行参数获取，或使用默认值)
// 用法: node scripts/importAllowedUsers.js [csv_path]
const csvPath = process.argv[2] || "./data/alloweduser.csv";

async function importUsers() {
  // 读取CSV文件
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());

  // 跳过表头
  const dataLines = lines.slice(1);

  // 解析CSV
  const users = dataLines.map(line => {
    // 处理BOM和空白
    const cleanLine = line.replace(/^\uFEFF/, "").trim();
    const [name, phoneNumber, department] = cleanLine.split(",").map(s => s.trim());
    return { name, phoneNumber, department };
  }).filter(u => u.name && u.phoneNumber);

  console.log(`解析到 ${users.length} 条用户记录`);

  // 分批导入（每批100条）
  const batchSize = 100;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(`正在导入第 ${Math.floor(i / batchSize) + 1} 批 (${batch.length} 条)...`);

    try {
      const result = await client.mutation(api.auth.batchImportAllowedUsers, { users: batch });
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
      console.log(`  插入: ${result.inserted}, 跳过: ${result.skipped}`);
    } catch (error) {
      console.error(`  导入失败:`, error.message);
    }
  }

  console.log(`\n导入完成！`);
  console.log(`总计插入: ${totalInserted}`);
  console.log(`总计跳过: ${totalSkipped}`);
}

importUsers().catch(console.error);
