# 네트워크 — 무과금(VPC/서브넷/IGW/라우트). 돈 나가는 NAT Gateway는 만들지 않는다.
# 전략: Fargate를 퍼블릭 서브넷+퍼블릭IP로 띄워 NAT 없이 아웃바운드(ECR/PortOne) 처리.
#       RDS는 사설 서브넷에 둬 인터넷 비노출(VPC 내부 통신만).

# 가용영역 조회 — ALB/RDS는 최소 2개 AZ 필요
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-vpc" }
}

# 인터넷 게이트웨이 — 퍼블릭 서브넷의 인터넷 출입구
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

# 퍼블릭 서브넷 2개 — ALB + Fargate(퍼블릭IP 자동 할당)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project}-public-${count.index}" }
}

# 사설 서브넷 2개 — RDS 전용(인터넷 라우트 없음)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-private-${count.index}" }
}

# 퍼블릭 라우트 테이블 → IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
