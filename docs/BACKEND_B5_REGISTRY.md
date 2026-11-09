# B5.7 — Image phát hành qua GHCR

Ngày 09/11/2026: đã fast-forward main tới `98a2061` và phát hành thành công image Linux amd64 lên GHCR. [Lần phát hành](https://github.com/VanHien1313/Website_Apple_v1/actions/runs/42640475890) đạt cả verify và publish. [Manifest đã lưu](releases/2026-11-09-ghcr.json) là hồ sơ cho bản này.

```env
AURA_IMAGE=ghcr.io/vanhien1313/website_apple_v1@sha256:788e0b4bd58b9fbd833bced9facccde04921c2637018b14bac6d72182015345b
```

Chưa triển khai staging/VPS. File staging.env.example vẫn là template có placeholder; dùng digest ở trên trong cấu hình staging thật.

## Luồng đã cấu hình

Workflow `Verify application` giữ quyền `contents: read` cho job kiểm thử. Sau khi build, backend tests, E2E và restart/restore đều đạt, job xác nhận image ID của container app khớp image được lưu rồi xuất `image.tar.gz`. Artifact `tested-image-<run>-<attempt>` chỉ giữ 1 ngày và chỉ chứa image, không chứa database, secrets hoặc backup. Các file đó được mount lúc chạy container, không đóng vào image.

Job `publish` chỉ chạy khi chọn thủ công `publish_image=true` trên default branch và job verify thành công. Job này mới có `packages: write`; tải artifact trong cùng run/attempt, kiểm tra image ID và Linux amd64, đăng nhập bằng `GITHUB_TOKEN`, tag và push image đã kiểm thử **không build lại**. Sau push, job pull lại theo digest và đối chiếu image ID. Token chỉ truyền qua stdin, cấu hình Docker auth nằm trong thư mục tạm của runner và được logout ở bước always.

Tag có dạng `sha-<commit>-run-<run>-<attempt>`, không dùng latest. Tag vẫn có thể bị ghi đè bởi người có quyền registry; staging phải dùng tham chiếu `ghcr.io/...@sha256:...` trong manifest, không dùng tag làm định danh bất biến.

## Khi sẵn sàng phát hành

1. Review và merge thay đổi cần phát hành vào default branch. Bản đầu tiên đã merge ngày 09/11/2026; những lần phát hành sau cần kiểm tra commit mới tương ứng.
2. Trong GitHub Actions, chọn **Verify application → Run workflow**, chọn default branch và bật `publish_image`. Workflow chạy lại toàn bộ kiểm thử trước khi phát hành.
3. Job publish phải đạt, bao gồm pull theo digest và kiểm tra image ID. Nếu GHCR từ chối quyền, kiểm tra package access của repository và chính sách Packages; không mở public package để né lỗi quyền.
4. Lưu artifact `release-<run>-<attempt>/release.json` (giữ 30 ngày) vào hồ sơ phát hành. Manifest chứa digest, image ID, commit, platform và liên kết CI; không chứa credential.
5. Dùng giá trị `image` làm `AURA_IMAGE` trong file staging thật. Không thay `deploy/image-lock.json.appRegistryReference` trước khi có manifest phát hành thành công.
6. Nếu package private, host staging cần đăng nhập GHCR bằng tài khoản có quyền đọc package, token `read:packages` theo hướng dẫn GitHub, qua `docker login --password-stdin`. Không gửi token trong chat, không lưu token vào repository hoặc env template. Kiểm tra visibility/access trong package settings trước khi phân phối.
7. Theo [B5.5 staging](BACKEND_B5_STAGING.md): preflight, backup, migration, start app và nghiệm thu HTTPS/SQL TLS/proxy trên host thật. Phát hành image không đồng nghĩa đã triển khai website.

## Kiểm chứng và giới hạn

- [CI run 42623431005](https://github.com/VanHien1313/Website_Apple_v1/actions/runs/42623431005), commit `14f4d3514e7fe940af64cda38ba743b251e73725`: job verify đạt, gồm backend/E2E/recovery, đối chiếu image ID, xuất image và upload artifact. Job publish skipped đúng thiết kế cho push. Đây là lần kiểm thử trước phát hành; lần 42640475890 sau đó đã đạt cả download/load, login, push và pull theo digest.
- Đã kiểm tra YAML, trigger thủ công mặc định tắt, default-branch gate, job dependency, phân quyền, artifact cùng run/attempt, action ghim SHA và cú pháp Bash.
- Download artifact v7 ghim `37930b1c2abaa49bbe596cd826c3c89aef350131` từ repository chính thức ngày 09/11/2026.
- Push/PR thông thường không chạy job publish. Đã xác nhận GHCR login/push/pull trên runner với GITHUB_TOKEN và image ID khớp manifest. Chưa xác nhận quyền đọc từ VPS hoặc thay đổi visibility của package.
- Artifact image bổ sung dùng storage GitHub; retention 1 ngày để giảm lưu trữ. Release manifest lưu 30 ngày; cần giữ bản hồ sơ phát hành riêng khi vận hành lâu dài.

Nguồn chính thức: [GitHub publishing images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Container registry và quyền truy cập](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [download-artifact](https://github.com/actions/download-artifact).
