import prisma from "@/lib/prisma";

export const subscriberService = {
  async getSubscribers(siteId, query = {}) {
    const { search, status, tag, skip = 0, take = 50 } = query;
    const where = { siteId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: Number(skip),
        take: Number(take),
        include: {
          lists: {
            include: {
              list: true
            }
          }
        }
      }),
      prisma.subscriber.count({ where }),
    ]);

    return { subscribers, total };
  },

  async createSubscriber(siteId, data) {
    const { email, name, status = "active", tags, metadata, listIds = [] } = data;
    
    // Create subscriber (or update if already exists for site)
    const subscriber = await prisma.subscriber.upsert({
      where: {
        siteId_email: {
          siteId,
          email,
        }
      },
      update: {
        name,
        status,
        tags,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
      create: {
        siteId,
        email,
        name,
        status,
        tags,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }
    });

    // Link to subscriber lists if provided
    if (listIds.length > 0) {
      await Promise.all(
        listIds.map((listId) =>
          prisma.subscriberListMember.upsert({
            where: {
              listId_subscriberId: {
                listId,
                subscriberId: subscriber.id,
              }
            },
            update: {},
            create: {
              listId,
              subscriberId: subscriber.id,
            }
          })
        )
      );
    }

    return subscriber;
  },

  async deleteSubscriber(siteId, id) {
    return prisma.subscriber.delete({
      where: { id, siteId },
    });
  },

  async importSubscribersCsv(siteId, listId, rows) {
    // rows is an array of { email, name }
    let imported = 0;
    for (const row of rows) {
      if (!row.email || !row.email.includes("@")) continue;
      
      const sub = await this.createSubscriber(siteId, {
        email: row.email.trim(),
        name: row.name ? row.name.trim() : null,
        status: "active",
        listIds: listId ? [listId] : [],
      });
      imported++;
    }
    return { success: true, count: imported };
  },

  async getLists(siteId) {
    return prisma.subscriberList.findMany({
      where: { siteId },
      include: {
        _count: {
          select: { subscribers: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async createList(siteId, data) {
    const { name, description } = data;
    return prisma.subscriberList.create({
      data: {
        siteId,
        name,
        description,
      }
    });
  },

  async deleteList(siteId, id) {
    return prisma.subscriberList.delete({
      where: { id, siteId }
    });
  },

  async updateSubscriber(siteId, id, data) {
    const { name, status, tags } = data;
    return prisma.subscriber.update({
      where: { id, siteId },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(tags !== undefined && { tags }),
      }
    });
  },

  async updateList(siteId, id, data) {
    const { name, description } = data;
    return prisma.subscriberList.update({
      where: { id, siteId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      }
    });
  },

  async getListMembers(siteId, listId) {
    const members = await prisma.subscriberListMember.findMany({
      where: { listId, subscriber: { siteId } },
      include: { subscriber: true }
    });
    return members.map(m => m.subscriber);
  },

  async addSubscriberToList(siteId, listId, subscriberId) {
    // Verify ownership of both list and subscriber
    const list = await prisma.subscriberList.findFirst({ where: { id: listId, siteId } });
    const sub = await prisma.subscriber.findFirst({ where: { id: subscriberId, siteId } });
    if (!list || !sub) throw new Error("List or Subscriber not found");

    return prisma.subscriberListMember.upsert({
      where: {
        listId_subscriberId: { listId, subscriberId }
      },
      update: {},
      create: { listId, subscriberId }
    });
  },

  async removeSubscriberFromList(siteId, listId, subscriberId) {
    // Verify ownership
    const list = await prisma.subscriberList.findFirst({ where: { id: listId, siteId } });
    if (!list) throw new Error("List not found");

    return prisma.subscriberListMember.delete({
      where: {
        listId_subscriberId: { listId, subscriberId }
      }
    });
  },

  async addBulkSubscribersToList(siteId, listId, subscriberIds = []) {
    const list = await prisma.subscriberList.findFirst({ where: { id: listId, siteId } });
    if (!list) throw new Error("List not found");

    if (subscriberIds.length === 0) return { success: true, count: 0 };

    const validSubs = await prisma.subscriber.findMany({
      where: { id: { in: subscriberIds }, siteId },
      select: { id: true }
    });

    const createData = validSubs.map(sub => ({
      listId,
      subscriberId: sub.id
    }));

    await prisma.subscriberListMember.createMany({
      data: createData,
      skipDuplicates: true
    });

    return { success: true, count: createData.length };
  },

  async removeBulkSubscribersFromList(siteId, listId, subscriberIds = []) {
    const list = await prisma.subscriberList.findFirst({ where: { id: listId, siteId } });
    if (!list) throw new Error("List not found");

    if (subscriberIds.length === 0) return { success: true, count: 0 };

    await prisma.subscriberListMember.deleteMany({
      where: {
        listId,
        subscriberId: { in: subscriberIds }
      }
    });

    return { success: true };
  }
};
