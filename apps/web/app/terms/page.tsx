export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Điều khoản sử dụng</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Mục đích sử dụng</h2>
        <p>
          Cờ Tướng được cung cấp cho mục đích học tập và giải trí. Bạn đồng ý sử dụng nền tảng một cách hợp pháp và
          không gây ảnh hưởng đến trải nghiệm của người chơi khác, bao gồm việc gian lận trong ván đấu trực tuyến.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Không bảo hành</h2>
        <p>
          Nền tảng được cung cấp &quot;nguyên trạng&quot; (as is), không kèm theo bất kỳ bảo đảm nào về tính liên
          tục, tính chính xác hoặc sự phù hợp cho một mục đích cụ thể. Đây là phiên bản thử nghiệm và có thể thay đổi
          hoặc gián đoạn.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Tài khoản và phiên khách</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Bạn có thể chơi với tư cách khách (guest) mà không cần đăng ký. Phiên khách có thể bị hết hạn hoặc xóa.</li>
          <li>Biệt danh bạn chọn không được vi phạm pháp luật hoặc mạo danh người khác.</li>
          <li>Chúng tôi có quyền tạm khóa hoặc xóa tài khoản và phiên khách vi phạm điều khoản này.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Kết quả ván đấu</h2>
        <p>
          Kết quả ván cờ trực tuyến do máy chủ quyết định theo bộ luật được công bố tại trang Luật chơi. Các kết quả
          này không mang giá trị thi đấu chính thức.
        </p>
      </section>
    </main>
  )
}
