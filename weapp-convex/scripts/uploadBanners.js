// scripts/uploadBanners.js
import dotenv from 'dotenv';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "fs";
import path from "path";

// 加载 .env.local 配置
dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: 请在 .env.local 中设置 VITE_CONVEX_URL");
  console.error("Error: Please set VITE_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Banner图片目录 (从命令行参数获取，或使用默认值)
// 用法: node scripts/uploadBanners.js [banner_dir]
const bannerDir = process.argv[2] || "./images/banner";

async function uploadBanners() {
  // 获取banner目录下的所有图片
  const files = fs.readdirSync(bannerDir).filter(f =>
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );

  console.log(`找到 ${files.length} 张banner图片`);

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(bannerDir, fileName);

    console.log(`正在上传: ${fileName}...`);

    try {
      // 1. 获取上传URL
      const uploadUrl = await client.mutation(api.banners.generateUploadUrl);

      // 2. 读取文件
      const fileBuffer = fs.readFileSync(filePath);

      // 3. 上传文件到Convex Storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
        },
        body: fileBuffer,
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      const { storageId } = await response.json();

      // 4. 添加banner记录到数据库
      await client.mutation(api.banners.addBanner, {
        storageId: storageId,
        name: fileName,
        sortOrder: i + 1,
      });

      console.log(`  成功: ${fileName} (sortOrder: ${i + 1})`);
    } catch (error) {
      console.error(`  失败: ${fileName}`, error.message);
    }
  }

  console.log("\n上传完成！");
}

uploadBanners().catch(console.error);
