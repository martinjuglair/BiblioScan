export interface CategoryProps {
  id: string;
  name: string;
  emoji: string | null;
  createdAt: Date;
}

export class Category {
  constructor(public readonly props: CategoryProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get emoji(): string | null {
    return this.props.emoji;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
