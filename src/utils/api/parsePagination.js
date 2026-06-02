export function parsePaginatedResponse(payload) {
    const root = payload?.data ?? payload;

    if (Array.isArray(root)) {
        return {
            items: root,
            total: root.length,
            page: 1,
            limit: root.length || 20,
            totalPages: 1,
        };
    }

    const items =
        root?.items ??
        root?.data ??
        root?.lids ??
        root?.content ??
        root?.results ??
        [];

    const total =
        root?.total ??
        root?.totalElements ??
        root?.totalCount ??
        root?.meta?.total ??
        items.length;

    const limit =
        root?.limit ?? root?.pageSize ?? root?.size ?? root?.meta?.limit ?? 20;

    const page = root?.page ?? root?.currentPage ?? root?.meta?.page ?? 1;

    const totalPages =
        root?.totalPages ??
        root?.total_pages ??
        root?.total_page ??
        root?.meta?.totalPages ??
        root?.meta?.total_pages ??
        root?.meta?.total_page ??
        Math.max(1, Math.ceil(total / limit));

    return { items, total, page, limit, totalPages };
}

export function unwrapEntity(payload) {
    return payload?.data ?? payload?.lid ?? payload;
}
