// scripts/importTelbook.js
import dotenv from 'dotenv';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// 加载 .env.local 配置
dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: 请在 .env.local 中设置 VITE_CONVEX_URL");
  console.error("Error: Please set VITE_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// 电话簿数据
const phoneArr = [
  {"NAME":"市场部","REMARK":"总监办","OUTPHONE":"9010001","INPHONE":"1001"},
  {"NAME":"人力资源部","REMARK":"招聘科","OUTPHONE":"9010002","INPHONE":"1002"},
  {"NAME":"财务部","REMARK":"出纳室","OUTPHONE":"9010003","INPHONE":"1003"},
  {"NAME":"研发部","REMARK":"项目组","OUTPHONE":"9010004","INPHONE":"1004"},
  {"NAME":"行政部","REMARK":"后勤组","OUTPHONE":"9010005","INPHONE":"1005"}
];

async function importTelbook() {
  console.log(`准备导入 ${phoneArr.length} 条电话记录...`);

  // 转换数据格式
  const records = phoneArr.map(item => ({
    name: item.NAME,
    remark: item.REMARK,
    outPhone: item.OUTPHONE,
    inPhone: item.INPHONE,
  }));

  // 分批导入（每批50条）
  const batchSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    console.log(`正在导入第 ${Math.floor(i / batchSize) + 1} 批 (${batch.length} 条)...`);

    try {
      const result = await client.mutation(api.telbook.batchImportTelbook, { records: batch });
      totalInserted += result.inserted;
      console.log(`  成功插入: ${result.inserted} 条`);
    } catch (error) {
      console.error(`  导入失败:`, error.message);
    }
  }

  console.log(`\n导入完成！总计插入: ${totalInserted} 条`);
}

importTelbook().catch(console.error);
