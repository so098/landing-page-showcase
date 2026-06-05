# AWS 프로바이더 — aws configure의 자격증명/리전을 사용.
# default_tags로 모든 리소스에 공통 태그를 박아 비용 추적/정리를 쉽게 한다.
provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
