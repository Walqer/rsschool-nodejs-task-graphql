import {
  Post as IPost,
  PrismaClient,
  Profile as IProfile,
  User as IUser,
} from '@prisma/client';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { UUIDType } from './types/uuid.js';

export const MemberTypeId = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: 'BASIC' },
    BUSINESS: { value: 'BUSINESS' },
  },
});

export const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: {
    id: { type: MemberTypeId },
    discount: { type: GraphQLFloat },
    postsLimitPerMonth: { type: GraphQLInt },
  },
});

const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    memberTypeId: { type: MemberTypeId },
  },
});

const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLString },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeId) },
  },
});

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: {
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const Profile = new GraphQLObjectType({
  name: 'Profile',
  fields: {
    id: { type: new GraphQLNonNull(UUIDType) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    memberType: {
      type: new GraphQLNonNull(MemberType),
      resolve: async (
        { userId }: { userId: string },
        _,
        { prisma }: { prisma: PrismaClient },
      ) => {
        const memberType = await prisma.memberType.findFirst({
          where: {
            profiles: {
              some: { userId },
            },
          },
        });
        return memberType;
      },
    },
  },
});

const User: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    profile: {
      type: Profile,
      resolve: async (
        { id }: { id: string },
        _,
        { prisma }: { prisma: PrismaClient },
      ) => {
        return prisma.profile.findUnique({ where: { userId: id } });
      },
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
      resolve: async (
        { id }: { id: string },
        _,
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result = await prisma.post.findMany({
          where: {
            authorId: id,
          },
        });
        return result;
      },
    },
    userSubscribedTo: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
      resolve: async (
        { id }: { id: string },
        _,
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result = await prisma.subscribersOnAuthors.findMany({
          where: {
            subscriberId: id,
          },
          select: {
            author: true,
          },
        });
        return result.map((subscription) => subscription.author);
      },
    },
    subscribedToUser: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
      resolve: async (
        { id }: { id: string },
        _,
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result = await prisma.subscribersOnAuthors.findMany({
          where: {
            authorId: id,
          },
          select: {
            subscriber: true,
          },
        });
        return result.map((subscription) => subscription.subscriber);
      },
    },
  }),
});

const RootQueryType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    memberTypes: <GraphQLFieldConfig<unknown, { prisma: PrismaClient }>>{
      type: new GraphQLNonNull(new GraphQLList(MemberType)),
      resolve: async (_, __, { prisma }) => {
        const result = await prisma.memberType.findMany();
        return result;
      },
    },
    memberType: <GraphQLFieldConfig<unknown, { prisma: PrismaClient }, { id: string }>>{
      type: MemberType,
      args: { id: { type: new GraphQLNonNull(MemberTypeId) } },
      resolve: async (_, { id }, { prisma }) => {
        const result = await prisma.memberType.findUnique({
          where: {
            id,
          },
        });
        return result;
      },
    },
    users: {
      type: new GraphQLNonNull(new GraphQLList(User)),
      resolve: async (_, __, { prisma }) => {
        const result = await prisma.user.findMany();
        return result;
      },
    },
    user: {
      type: User,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, { id }: { id: string }, { prisma }) => {
        const result = prisma.user.findUnique({
          where: {
            id,
          },
        });
        return result;
      },
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(Post)),
      resolve: async (_, __, { prisma }) => {
        const result = await prisma.post.findMany();
        return result;
      },
    },
    post: {
      type: Post,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, { id }: { id: string }, { prisma }) =>
        prisma.post.findUnique({ where: { id } }),
    },
    profiles: {
      type: new GraphQLNonNull(new GraphQLList(Profile)),
      resolve: async (_, __, { prisma }) => {
        const result = await prisma.profile.findMany();
        return result;
      },
    },
    profile: {
      type: Profile,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, { id }: { id: string }, { prisma }) => {
        const result = await prisma.profile.findUnique({
          where: {
            id,
          },
        });
        return result;
      },
    },
  },
});

export const memberType: GraphQLFieldConfig<unknown, { prisma: PrismaClient }> = {
  type: MemberType,
  resolve: async (_, __, { prisma }) => {
    const result = await prisma.memberType.findMany();
    return result[0];
  },
};

const Mutations = new GraphQLObjectType({
  name: 'Mutations',
  fields: {
    createUser: {
      type: User,
      args: {
        userArgs: {
          type: new GraphQLNonNull(CreateUserInput),
        },
      },
      resolve: async (
        _,
        { dto }: { dto: Omit<IUser, 'id'> },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IUser = await prisma.user.create({
          data: {
            ...dto,
          },
        });
        return result;
      },
    },
    createProfile: {
      type: Profile,
      args: {
        profileArgs: {
          type: new GraphQLNonNull(CreateProfileInput),
        },
      },
      resolve: async (
        _,
        { dto }: { dto: Omit<IProfile, 'id'> },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IProfile = await prisma.profile.create({
          data: {
            ...dto,
          },
        });
        return result;
      },
    },
    createPost: {
      type: Post,
      args: {
        postArgs: {
          type: new GraphQLNonNull(CreatePostInput),
        },
      },
      resolve: async (
        _,
        { dto }: { dto: Omit<IPost, 'id'> },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IPost = await prisma.post.create({
          data: {
            ...dto,
          },
        });
        return result;
      },
    },
    changePost: {
      type: Post,
      args: {
        id: {
          type: new GraphQLNonNull(UUIDType),
        },
        dto: {
          type: new GraphQLNonNull(ChangePostInput),
        },
      },
      resolve: async (
        _,
        { id, dto }: { id: string; dto: Omit<IPost, 'id'> },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IPost = await prisma.post.update({
          where: { id },
          data: {
            ...dto,
          },
        });
        return result;
      },
    },
    changeProfile: {
      type: Profile,
      args: {
        id: {
          type: new GraphQLNonNull(UUIDType),
        },
        dto: {
          type: new GraphQLNonNull(ChangeProfileInput),
        },
      },
      resolve: async (
        _,
        { id, dto }: { id: string; dto: Omit<IProfile, 'id'> },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IProfile = await prisma.profile.update({
          where: { id },
          data: {
            ...dto,
          },
        });
        return result;
      },
    },
    changeUser: {
      type: User,
      args: {
        id: {
          type: new GraphQLNonNull(UUIDType),
        },
        dto: {
          type: new GraphQLNonNull(ChangeUserInput),
        },
      },
      resolve: async (
        _,
        { id, dto }: { id: string; dto: Omit<IUser, 'id'> },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IUser = await prisma.user.update({
          where: { id },
          data: {
            ...dto,
          },
        });
        return result;
      },
    },
    deleteUser: {
      type: User,
      args: {
        id: {
          type: new GraphQLNonNull(UUIDType),
        },
      },
      resolve: async (
        _,
        { id }: { id: string },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IUser = await prisma.user.delete({
          where: { id },
        });
        return result;
      },
    },
    deletePost: {
      type: Post,
      args: {
        id: {
          type: new GraphQLNonNull(UUIDType),
        },
      },
      resolve: async (
        _,
        { id }: { id: string },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IPost = await prisma.post.delete({
          where: { id },
        });
        return result;
      },
    },
    deleteProfile: {
      type: Profile,
      args: {
        id: {
          type: new GraphQLNonNull(UUIDType),
        },
      },
      resolve: async (
        _,
        { id }: { id: string },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result: IProfile = await prisma.profile.delete({
          where: { id },
        });
        return result;
      },
    },
    subscribeTo: {
      type: User,
      args: {
        userId: {
          type: new GraphQLNonNull(UUIDType),
        },
        authorId: {
          type: new GraphQLNonNull(UUIDType),
        },
      },
      resolve: async (
        _,
        { userId, authorId }: { userId: string; authorId: string },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result = await prisma.subscribersOnAuthors.create({
          data: {
            subscriberId: userId,
            authorId,
          },
        });
        return result;
      },
    },
    unsubscribeFrom: {
      type: User,
      args: {
        userId: {
          type: new GraphQLNonNull(UUIDType),
        },
        authorId: {
          type: new GraphQLNonNull(UUIDType),
        },
      },
      resolve: async (
        _,
        { userId, authorId }: { userId: string; authorId: string },
        { prisma }: { prisma: PrismaClient },
      ) => {
        const result = await prisma.subscribersOnAuthors.delete({
          where: {
            subscriberId_authorId: {
              subscriberId: userId,
              authorId,
            },
          },
        });
        return result;
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: Mutations,
});
