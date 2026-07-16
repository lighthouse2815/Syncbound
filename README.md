# Syncbound (Nối Nhịp)

**Syncbound** là game platform co-op online dành cho đúng hai người chơi. Mỗi người điều khiển một nhân vật trên thiết bị riêng, cùng chạy, nhảy, kích hoạt cơ chế và cứu nhau qua một đường đua đầy chướng ngại vật.

Trong Syncbound, một người không thể tự mình hoàn thành màn chơi. Cả hai phải giữ đúng khoảng cách, phối hợp đúng thời điểm và cùng bước vào vùng đích để chiến thắng.

## Tính năng nổi bật

- Tạo phòng riêng bằng mã gồm 5 ký tự.
- Chia sẻ đường dẫn phòng để mời người chơi thứ hai.
- Vật lý được xử lý trên server với tốc độ 60 tick/giây.
- Bàn đạp đôi yêu cầu hai người đứng đúng vị trí để mở cổng.
- Cầu năng lượng chỉ tồn tại khi hai nhân vật giữ khoảng cách đủ gần.
- Khóa đồng bộ yêu cầu cả hai cùng giữ phím tương tác.
- Hệ thống checkpoint chung, ngã và cứu đồng đội.
- Hỗ trợ bàn phím trên máy tính và nút cảm ứng trên điện thoại.

## Công nghệ sử dụng

- React 19 và TypeScript.
- Vite 7.
- Node.js và Express 5.
- Socket.IO cho kết nối realtime.
- Canvas API cho phần hiển thị màn chơi.
- Node Test Runner cho unit test và integration test.

## Yêu cầu môi trường

- Node.js 20 trở lên.
- pnpm 11 trở lên.

Kiểm tra phiên bản đang sử dụng:

```powershell
node --version
pnpm --version
```

## Chạy local ở chế độ phát triển

```powershell
cd T:\Syncbound
pnpm install
pnpm dev
```

Sau khi khởi động:

- Giao diện phát triển: [http://localhost:5173](http://localhost:5173)
- Server realtime: [http://localhost:3001](http://localhost:3001)
- Kiểm tra server: [http://localhost:3001/health](http://localhost:3001/health)

Nếu `localhost` đang bị một dịch vụ khác chiếm, hãy dùng `127.0.0.1` thay thế.

## Chạy bản production local

```powershell
cd T:\Syncbound
pnpm install
pnpm build
pnpm start
```

Mở [http://127.0.0.1:3001](http://127.0.0.1:3001) để chơi.

## Chơi trên hai máy cùng mạng Wi-Fi

1. Trên máy chủ, chạy `pnpm build` và `pnpm start`.
2. Chạy lệnh `ipconfig` để tìm địa chỉ IPv4, ví dụ `192.168.1.25`.
3. Cả hai người truy cập `http://192.168.1.25:3001`.
4. Người thứ nhất chọn **Tạo phòng** rồi gửi mã hoặc đường dẫn mời.
5. Người thứ hai nhập mã phòng và nhấn **Vào**.
6. Cả hai nhấn **Tôi sẵn sàng** để bắt đầu.

Nếu Windows Firewall hỏi quyền truy cập cho Node.js, hãy cho phép ứng dụng hoạt động trong mạng Private.

## Điều khiển

| Phím | Hành động |
| --- | --- |
| `A`, `D` hoặc phím mũi tên | Di chuyển |
| `W`, mũi tên lên hoặc `Space` | Nhảy |
| `E` hoặc `Shift` | Tương tác và cứu đồng đội |

## Kiểm tra mã nguồn

```powershell
pnpm test
pnpm build
```

Bộ kiểm tra bao gồm:

- Cơ chế bàn đạp đôi.
- Cầu năng lượng theo khoảng cách.
- Hai khóa đồng bộ.
- Kết nối realtime bằng hai Socket.IO client thật.

## Tải dự án từ GitHub

```powershell
git clone https://github.com/lighthouse2815/Syncbound.git
cd Syncbound
pnpm install
pnpm dev
```

Repository chính thức: [github.com/lighthouse2815/Syncbound](https://github.com/lighthouse2815/Syncbound)

## Đẩy thay đổi lên GitHub

```powershell
git add .
git commit -m "Mô tả thay đổi"
git push origin main
```

## Cấu trúc thư mục

```text
Syncbound/
|-- src/                    Giao diện React, HUD, canvas và điều khiển
|-- server/                 Server Socket.IO và game engine
|-- dist/                   Bản build production, không đưa lên Git
|-- index.html              Điểm vào của ứng dụng
|-- package.json            Scripts và dependencies
|-- pnpm-lock.yaml          Phiên bản dependency đã khóa
`-- README.md               Tài liệu dự án
```

## Trạng thái dự án

Phiên bản hiện tại đã có một màn chơi hoàn chỉnh, phòng online hai người, điều khiển cảm ứng và bộ kiểm tra tự động. Để chơi qua Internet, hãy triển khai server Node.js lên một dịch vụ có hỗ trợ WebSocket.
