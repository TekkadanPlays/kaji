// NIP-01 filter builder

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: `#${string}`]: string[] | undefined;
}

// Fluent filter builder
export class FilterBuilder {
  private filter: NostrFilter = {};

  ids(...ids: string[]): this {
    this.filter.ids = (this.filter.ids || []).concat(ids);
    return this;
  }

  authors(...authors: string[]): this {
    this.filter.authors = (this.filter.authors || []).concat(authors);
    return this;
  }

  kinds(...kinds: number[]): this {
    this.filter.kinds = (this.filter.kinds || []).concat(kinds);
    return this;
  }

  since(timestamp: number): this {
    this.filter.since = timestamp;
    return this;
  }

  until(timestamp: number): this {
    this.filter.until = timestamp;
    return this;
  }

  limit(n: number): this {
    this.filter.limit = n;
    return this;
  }

  tag(letter: string, ...values: string[]): this {
    const key = `#${letter}` as `#${string}`;
    this.filter[key] = ((this.filter[key] as string[] | undefined) || []).concat(values);
    return this;
  }

  // Shorthand for #e tag
  events(...eventIds: string[]): this {
    return this.tag('e', ...eventIds);
  }

  // Shorthand for #p tag
  pubkeys(...pubkeys: string[]): this {
    return this.tag('p', ...pubkeys);
  }

  // Shorthand for #h tag (NIP-29 groups)
  group(groupId: string): this {
    return this.tag('h', groupId);
  }

  build(): NostrFilter {
    return { ...this.filter };
  }
}

export function filter(): FilterBuilder {
  return new FilterBuilder();
}
