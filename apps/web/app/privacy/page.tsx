export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Quyền riêng tư</h1>

      <p>
        Cờ Tướng là nền tảng học và chơi cờ tướng mang tính học tập và giải trí, không phải một dịch vụ thương mại.
        Trang này mô tả ngắn gọn những dữ liệu mà ứng dụng lưu trữ để vận hành.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Dữ liệu được lưu trữ</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            <strong>Tài khoản:</strong> biệt danh (nickname), loại tài khoản và thời điểm tạo tài khoản.
          </li>
          <li>
            <strong>Phiên khách (guest):</strong> người chơi chưa đăng ký có thể dùng phiên khách để chơi; phiên này
            được dùng để nhận diện người chơi trong quá trình sử dụng.
          </li>
          <li>
            <strong>Lịch sử ván đấu:</strong> thông tin ván cờ, các nước đi và ảnh chụp trạng thái ván để phục vụ
            việc xem lại ván.
          </li>
          <li>
            <strong>Tiến độ học tập:</strong> các bài học và bài tập bạn đã hoàn thành.
          </li>
          <li>
            <strong>Phòng chơi:</strong> thông tin phòng bạn tạo hoặc tham gia.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Mục đích sử dụng</h2>
        <p>
          Dữ liệu chỉ được dùng để vận hành các tính năng chơi, lưu lịch sử ván đấu và theo dõi tiến độ học tập của
          bạn. Chúng tôi không bán dữ liệu cá nhân của bạn.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Phạm vi cam kết</h2>
        <p>
          Đây là phiên bản thử nghiệm (beta). Trang này không phải tài liệu tuân thủ pháp luật về bảo vệ dữ liệu
          cá nhân và không tuyên bố chứng nhận tuân thủ bất kỳ quy định nào.
        </p>
      </section>
    </main>
  )
}
