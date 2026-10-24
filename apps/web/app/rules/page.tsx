export default function RulesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Luật chơi</h1>

      <section className="flex flex-col gap-3">
        <p className="rounded-md border border-border bg-muted p-4 font-medium">
          Luật giản lược (casual) — không phải luật thi đấu chính thức AXF.
        </p>
        <p>
          Nền tảng này áp dụng bộ luật giản lược có tên <code>xq-casual-1.0.0</code> (ADR-017) cho các
          ván chơi thông thường và luyện tập. Bộ luật này được công bố rõ ràng và không được quảng bá là luật
          thi đấu chính thức.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Kết thúc ván cờ</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            <strong>Hết nước đi:</strong> nếu đến lượt đi mà không còn nước đi hợp lệ, bên đó thua ngay, kể cả khi
            không bị chiếu tướng. Trong cờ tướng không có kết quả hòa do hết nước đi.
          </li>
          <li>
            <strong>Chiếu liên tục (lặp thế do chiếu):</strong> khi cùng một thế cờ (cùng bàn cờ và cùng bên đến
            lượt) xuất hiện lần thứ 3, nếu trong khoảng giữa các lần đó chỉ một bên chiếu tướng ở mọi nước đi của
            chính mình, thì bên chiếu tướng liên tục thua.
          </li>
          <li>
            <strong>Lặp thế thông thường:</strong> khi cùng một thế cờ xuất hiện lần thứ 3 nhưng không thuộc trường
            hợp chiếu liên tục ở trên, ván cờ hòa.
          </li>
          <li>
            <strong>Đuổi quân:</strong> bộ luật này không xử lý luật đuổi quân (truy đuổi liên tục một quân không
            chiếu tướng). Nếu ván lặp thế do đuổi quân, ván được xử hòa như lặp thế thông thường.
          </li>
          <li>
            <strong>Giới hạn nước không ăn quân:</strong> sau 60 nước đi (120 nửa nước) liên tiếp không ăn quân,
            ván cờ hòa.
          </li>
          <li>
            <strong>Không đủ quân tấn công:</strong> nếu cả hai bên đều không còn Xe, Mã, Pháo hoặc Tốt, ván cờ hòa.
          </li>
          <li>
            <strong>Đầu hàng, đề nghị hòa, hết giờ:</strong> ván cờ kết thúc theo lựa chọn của người chơi hoặc khi hết
            thời gian theo quy định của ván.
          </li>
        </ul>
      </section>
    </main>
  )
}
