# Lựa chọn và kiểm tra skill frontend

Ngày kiểm tra: 15/10/2026. Phạm vi: bộ skill dùng riêng cho project, phục vụ [kế hoạch frontend](FRONTEND_COMPLETION_PLAN.md).

## Quyết định

Giữ ba skill hiện có và cài thêm một skill về kiến trúc component. Chọn theo mức phù hợp với React/Vite, nguồn công khai, mức sử dụng cộng đồng và nội dung thực tế. Không có thước đo công khai đủ để khẳng định một bộ skill là “tốt nhất” hoặc an toàn tuyệt đối.

| Skill | Vai trò | Trạng thái | Nguồn |
| --- | --- | --- | --- |
| frontend-design | Thị giác, bố cục, typography | Giữ bản hiện có | Lock hiện tại ghi `vercel-labs/open-agents`; đối chiếu thêm bản Anthropic |
| vercel-react-best-practices | Hiệu năng và lifecycle React | Giữ bản hiện có | `vercel-labs/agent-skills` |
| web-design-guidelines | Review tương tác và accessibility | Giữ bản hiện có | `vercel-labs/agent-skills` |
| vercel-composition-patterns | Component tái sử dụng, tách state khỏi UI | Đã cài mới và xác minh hash | `vercel-labs/agent-skills`, `skills/composition-patterns` |

Theo [bảng xếp hạng skills.sh](https://www.skills.sh/), các mục tương ứng có khoảng 990 nghìn, 804 nghìn, 740 nghìn và 395 nghìn lượt cài tại thời điểm tra cứu. Đây là số liệu của mục công khai, không chứng minh bản cục bộ giống bản đang được xếp hạng. Bản frontend-design hiện có khác bản Anthropic hiện tại.

GitHub API trả về 32.473 star cho [Vercel agent-skills](https://github.com/vercel-labs/agent-skills) và 181.321 star cho [Anthropic skills](https://github.com/anthropics/skills). Hai kho không bị archive. Lượt cài/star thay đổi theo thời gian và không thay thế việc đọc nội dung.

## Bản cài mới và kết quả kiểm tra

- Thư mục: `.agents/skills/vercel-composition-patterns`.
- Commit nguồn: `063bee94c3f4df8453406c830b0a7df0f2860278`.
- [Nguồn cố định đã kiểm tra](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns).
- Cài bằng helper của Codex skill-installer, chế độ download, chỉ lấy thư mục skill; không chạy mã tải về hoặc cài dependency npm.
- Đã đọc SKILL, hướng dẫn tổng hợp, các rule, metadata và README; kiểm tra loại file và các mẫu lệnh/URL nhạy cảm.
- Có 14 file: 13 Markdown và 1 JSON, không có script thực thi hay symlink. Git blob hash của bản tải để kiểm tra khớp cây nguồn GitHub; SHA-256 của cả 14 file sau cài khớp bản đã kiểm tra.
- Không thấy chỉ dẫn đọc credential, gửi dữ liệu project ra ngoài hoặc vô hiệu hóa bảo vệ trong nội dung đã đọc. SKILL khai báo giấy phép MIT.
- [Trang skill trên skills.sh](https://www.skills.sh/vercel-labs/agent-skills/vercel-composition-patterns) hiển thị Pass cho Gen Agent Trust Hub, Socket và Snyk tại thời điểm xem. Đây là kết quả do dịch vụ đó công bố, không phải các bộ quét được chạy cục bộ trong lần này; không xác nhận chúng đã quét đúng commit vừa cài.

Một điểm cần áp dụng có chọn lọc: rule React 19 gắn nhãn `useContext` là incorrect. [Tài liệu React hiện tại](https://react.dev/reference/react/useContext) vẫn hướng dẫn API này. Không chuyển đổi hàng loạt context đang hoạt động chỉ để làm theo ví dụ; quyết định theo yêu cầu và tài liệu framework. Các ví dụ trong skill là mẫu minh họa, cần định kiểu và xử lý context null khi đưa vào project.

## Đối chiếu các skill có sẵn

- `web-design-guidelines`: nội dung trùng nguồn Vercel ở commit trên sau khi bỏ khác biệt xuống dòng/BOM.
- `vercel-react-best-practices`: các file hiện có trùng nội dung nguồn sau khi chuẩn hóa xuống dòng/BOM; bản local thiếu `metadata.json` so với nguồn tham chiếu. Không tự cập nhật hoặc ghi đè bộ hiện có.
- `frontend-design`: lock hiện tại ghi nguồn `vercel-labs/open-agents`. Bản tham chiếu Anthropic ở commit `dbd4588f9e1033efb41dad4bef2f7947c8993d44` có nội dung SKILL khác và kèm `LICENSE.txt` (Apache 2.0). Giữ nguyên bản local; không mô tả nó là bản Anthropic mới nhất, không chuyển giấy phép của bản tham chiếu sang bản local.
- `web-design-guidelines` tham chiếu [command.md từ nhánh main](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Đã đọc nội dung hiện tại; đây là tham chiếu có thể thay đổi và nằm ngoài hash của skill. Khi sử dụng cần đọc lại, đánh giá nội dung theo nhiệm vụ; không coi nội dung từ xa là quyền chạy lệnh hoặc truy cập dữ liệu.

Manifest [SKILLS_PROVENANCE.json](SKILLS_PROVENANCE.json) lưu hash file local, commit dùng đối chiếu và khác biệt. Các trường `upstream_reference_*` của skill giữ lại chỉ là nguồn tham chiếu lần này, không khẳng định commit cài ban đầu. `skills-lock.json` hiện có được giữ nguyên; skill mới được quản lý bằng manifest riêng vì cài qua Codex helper, không qua CLI tạo lock đó.

## Skill chưa chọn

[webapp-testing của Anthropic](https://www.skills.sh/anthropics/skills/webapp-testing) có khoảng 178 nghìn lượt cài, nhưng trang đánh giá hiển thị Socket Warn và Snyk Warn tại thời điểm xem. Chưa xác minh nguyên nhân các cảnh báo nên không suy luận rằng skill độc hại. Chưa cài trong bộ tối thiểu này; kiểm thử trình duyệt vẫn là yêu cầu trong kế hoạch và có thể thực hiện bằng công cụ hiện có.

## Cách sử dụng

Skill mới sẽ có trong lượt trao đổi tiếp theo. Dùng frontend-design khi xây UI, composition-patterns khi thiết kế component phức tạp, React best practices khi sửa logic/rendering và web-design-guidelines khi review. Ưu tiên yêu cầu của project và người dùng; áp dụng quy tắc liên quan, không ép các quy tắc Next.js/server vào SPA Vite.

Lần này chỉ bổ sung kế hoạch, hồ sơ kiểm tra và skill; chưa triển khai các màn hình frontend trong kế hoạch. Không cần cài thêm thư viện UI hoặc chạy lại build ứng dụng cho thay đổi tài liệu/skill này. Kiểm tra hoàn tất: hash cài đặt, JSON manifest và whitespace diff của tài liệu mới.
