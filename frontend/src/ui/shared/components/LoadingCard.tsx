import { Card, Flex, Skeleton } from "antd";
import type { CardProps } from "antd";

interface LoadingCardProps extends Omit<CardProps, "loading"> {
  rows?: number;
  avatar?: boolean;
  active?: boolean;
}

export function LoadingCard({
  rows = 3,
  avatar = false,
  active = true,
  ...cardProps
}: LoadingCardProps) {
  return (
    <Card {...cardProps}>
      <Skeleton active={active} avatar={avatar} paragraph={{ rows }} />
    </Card>
  );
}

interface LoadingListProps {
  count?: number;
  rows?: number;
  avatar?: boolean;
  gap?: number;
}

export function LoadingList({ count = 3, rows = 2, avatar = false, gap = 16 }: LoadingListProps) {
  return (
    <Flex vertical style={{ width: "100%" }} gap={gap}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} active avatar={avatar} paragraph={{ rows }} />
      ))}
    </Flex>
  );
}

interface LoadingTableProps {
  rows?: number;
}

export function LoadingTable({ rows = 5 }: LoadingTableProps) {
  return (
    <Flex vertical style={{ width: "100%" }} gap={16}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} active paragraph={{ rows: 1 }} />
      ))}
    </Flex>
  );
}
