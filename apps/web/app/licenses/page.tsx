export default function LicensesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Giấy phép</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Công cụ đánh giá nước đi: Pikafish</h2>
        <p>
          Máy chủ của Cờ Tướng sử dụng công cụ cờ tướng <strong>Pikafish</strong> để phân tích nước đi cho chế độ
          chơi với máy. Pikafish được phát hành theo <strong>GNU General Public License phiên bản 3 (GPLv3)</strong>.
          Bản đầy đủ của giấy phép có trong tệp <code>Copying.txt</code> của bản phân phối Pikafish.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Pikafish chỉ được chạy phía máy chủ; không được gửi đến trình duyệt hoặc ứng dụng của người dùng.</li>
          <li>Bản Pikafish được sử dụng không được chỉnh sửa so với bản phát hành gốc.</li>
          <li>
            Mã nguồn và hướng dẫn biên dịch của Pikafish: <a className="inline-flex min-h-11 items-center underline" href="https://github.com/official-pikafish/Pikafish">github.com/official-pikafish/Pikafish</a>.
          </li>
          <li>Danh sách tác giả Pikafish: tệp <code>AUTHORS</code> của dự án gốc.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Trọng số mạng nơ-ron NNUE</h2>
        <p>
          Đánh giá của Pikafish dùng một tệp trọng số mạng nơ-ron (<code>pikafish.nnue</code>). Trọng số này có{" "}
          <strong>giấy phép riêng</strong>, không thuộc GPLv3. Theo giấy phép NNUE của Pikafish:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Việc sử dụng trọng số đồng nghĩa với việc đồng ý với giấy phép NNUE.</li>
          <li>Trọng số chỉ được dùng cho mục đích hợp pháp; mọi hậu quả do sử dụng vượt phạm vi hợp pháp (ví dụ gian lận trực tuyến) thuộc về người dùng.</li>
          <li>Không được sử dụng thương mại nếu chưa có sự cho phép.</li>
          <li>
            Các trọng số huấn luyện cho biến thể cờ tướng của Fairy-Stockfish dùng giấy phép CC0 riêng và không bị
            ràng buộc bởi giấy phép NNUE này.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Thư viện mã nguồn mở khác</h2>
        <p>
          Các thư viện mã nguồn mở khác mà dự án sử dụng được liệt kê trong các tệp <code>package.json</code> của
          từng gói trong kho mã nguồn.
        </p>
      </section>
    </main>
  )
}
