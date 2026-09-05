export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function sourceLink(title: string, url: string): HTMLElement {
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol))
      return element("span", title);
    const link = element("a", title);
    link.href = parsed.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  } catch {
    return element("span", title);
  }
}

export function textList(items: string[]): HTMLUListElement {
  const list = element("ul");
  list.append(...items.map((text) => element("li", text)));
  return list;
}
