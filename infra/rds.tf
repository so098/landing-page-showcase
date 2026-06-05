# RDS Postgres — 프리티어(db.t4g.micro, 20GB, 단일 AZ). 사설 서브넷, 인터넷 비노출.

# DB 마스터 비밀번호 — 코드/깃에 두지 않고 생성(상태 파일에만 존재, 상태는 gitignore).
# special=false: DATABASE_URL 파싱을 깨뜨릴 수 있는 특수문자 회피.
resource "random_password" "db" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${var.project}-db" }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.micro" # 프리티어 대상(Graviton)

  allocated_storage = 20 # 프리티어 한도
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "melstudio"
  username = "melstudio"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  skip_final_snapshot = true # 개발 단계: 삭제 시 스냅샷 생략
  apply_immediately   = true

  tags = { Name = "${var.project}-db" }
}

# 앱이 읽을 DATABASE_URL — SSM Parameter Store(SecureString).
# ECS Task Definition이 이 파라미터를 secret으로 주입한다(증분4).
resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.project}/DATABASE_URL"
  description = "Prisma DATABASE_URL for api"
  type        = "SecureString"
  value       = "postgresql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
}
