# 랜딩 제작용 이미지 소재 버킷(비공개).
# 클립아트코리아 등 라이선스 자산을 담으므로 퍼블릭 노출 절대 금지(전체 차단).
# 운영자가 boto3(prepare 스크립트)로 업로드. 서빙은 추후 CloudFront로(여기선 저장만).

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "assets" {
  # 버킷명은 전역 유일해야 하므로 계정 ID를 접미사로
  bucket = "${var.project}-assets-${data.aws_caller_identity.current.account_id}"
}

# 퍼블릭 접근 전면 차단 (라이선스 자산 보호)
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 기본 서버사이드 암호화
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

output "assets_bucket" {
  description = "이미지 소재 S3 버킷명 (prepare 스크립트 --s3-bucket / CLIPART_S3_BUCKET)"
  value       = aws_s3_bucket.assets.id
}
