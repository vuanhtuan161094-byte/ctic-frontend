# CMP Frontend

Frontend của **Certification Management Platform (CMP)**. Runtime production hiện tại là **Vite + React + TypeScript + Ant Design**.

## Yêu cầu

- Node.js 24.x (repo cũng chấp nhận Node 22.12+)
- Backend CMP chạy riêng; frontend gọi API qua cấu hình môi trường

## Lệnh chính

```bash
npm ci
npm run dev
npm run typecheck
npm run typecheck:all
npm run lint
npm test
```

- `npm run dev`: Vite development server tại cổng 5173.
- `npm run build`: production build bằng `vite.ctic.config.ts`.
- `npm run typecheck`: kiểm tra TypeScript của production app.
- `npm run typecheck:all`: gate TypeScript cho toàn bộ source TypeScript còn thuộc frontend CMP.
- `npm run lint`: ESLint + React Hooks, không cho phép warning tích lũy.
- `npm test`: production build + toàn bộ regression tests frontend.

## Production

Cấu hình mẫu nằm tại `.env.production.example`. Production ưu tiên same-origin/reverse-proxy; khi `VITE_DEPLOYMENT_TARGET=production`, build sẽ từ chối API URL trỏ về localhost. Source map production được tắt.

## Kiến trúc runtime

- Browser entry: `index.html` → `src/main.tsx`.
- Application root: `app/components/CticApplication.tsx`.
- Authenticated shell được lazy-load sau khi khôi phục/xác thực session.
- Các màn hình nghiệp vụ lớn được code-split theo route để giảm tải ban đầu.
- Backend vẫn là authority cuối cùng cho quyền, workflow và mutation.

## Lưu ý

Repo này không dùng Next.js, vinext, Cloudflare Worker/D1 hay Drizzle cho runtime CMP. Scaffold thử nghiệm cũ được loại khỏi repository trong Step 18A stabilization. Tailwind/PostCSS vẫn được giữ vì stylesheet CMP hiện dùng `@import "tailwindcss"`.
