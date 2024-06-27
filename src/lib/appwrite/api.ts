import { ID, Query,ImageGravity } from "appwrite";
import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { account, appwriteconfig, avatar, database, storage } from "./config";


export async function createUserAccount(user: INewUser)
{
    try {

        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name,
        )

        if(!newAccount) throw Error;

        const avatarUrl =  avatar.getInitials(user.name);
        
        const newUser = await saveUserToDB({
            name: newAccount.name,
            email: newAccount.email,
            imageUrl: avatarUrl,
            accountId: newAccount.$id,
            username: user.username
        });

        return newUser;
        
    } catch (error) {
        console.log(error);
        return error;
        
    }


}

export async function saveUserToDB(user:{
    name: string,
    email: string,
    imageUrl: URL,
    accountId: string,
    username?: string
})
{
    try {
        const newUser = await database.createDocument(

            appwriteconfig.databaseId,
            appwriteconfig.userCollectionId,
            ID.unique(),
            user,
        );

        return newUser;
        
    } catch (error) {
        console.log(error);
        return error;
        
    }
  
}


export async function signInAccount(user: { email: string; password: string; }) {
    try {

      const session = await account.createEmailPasswordSession(user.email, user.password);
      return session;

    } catch (error) {
      console.log(error);
    }
  }
  


export async function getCurrentUser(){
    try {
        const currentAccount = await account.get();

        if(!currentAccount) throw Error;

        const currentUser = await database.listDocuments(
            appwriteconfig.databaseId,
            appwriteconfig.userCollectionId,[Query.equal('accountId', currentAccount.$id)],
    
         );

         if(!currentUser) throw Error;

         return currentUser.documents[0];
       
    } catch (error) {
        console.log(error);
        
    }
}


export async function signOutAccount() {
    try {
      const session = await account.deleteSession("current");
  
      return session;
    } catch (error) {
      console.log(error);
    }
  }


  
// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
    try {
      // Upload file to appwrite storage
      const uploadedFile = await uploadFile(post.file[0]);
  
      if (!uploadedFile) throw Error;
  
      // Get file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }
  
      // Convert tags into array
      const tags = post.tags?.replace(/ /g, "").split(",") || [];
  
      // Create post
      const newPost = await database.createDocument(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        ID.unique(),
        {
          creator: post.userId,
          caption: post.caption,
          imageUrl: fileUrl,
          imageId: uploadedFile.$id,
          location: post.location,
          tags: tags,
        }
      );
  
      if (!newPost) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }
  
      return newPost;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== UPLOAD FILE
  export async function uploadFile(file: File) {
    try {
      const uploadedFile = await storage.createFile(
        appwriteconfig.storageId,
        ID.unique(),
        file
      );
  
      return uploadedFile;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== GET FILE URL
  export function getFilePreview(fileId: string) {
    try {
      const fileUrl = storage.getFilePreview(
        appwriteconfig.storageId,
        fileId,
        2000,
        2000,
       ImageGravity.Top,
       100

      );
  
      if (!fileUrl) throw Error;
  
      return fileUrl;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== DELETE FILE
  export async function deleteFile(fileId: string) {
    try {
      await storage.deleteFile(appwriteconfig.storageId, fileId);
  
      return { status: "ok" };
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== GET POSTS
  export async function searchPosts(searchTerm: string) {
    try {
      const posts = await database.listDocuments(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        [Query.search("caption", searchTerm)]
      );
  
      if (!posts) throw Error;
  
      return posts;
    } catch (error) {
      console.log(error);
    }
  }
  
  export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];
  
    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam.toString()));
    }
  
    try {
      const posts = await database.listDocuments(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        queries
      );
  
      if (!posts) throw Error;
  
      return posts;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== GET POST BY ID
  export async function getPostById(postId?: string) {
    if (!postId) throw Error;
  
    try {
      const post = await database.getDocument(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        postId
      );
  
      if (!post) throw Error;
  
      return post;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== UPDATE POST
  export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;
  
    try {
      let image = {
        imageUrl: post.imageUrl,
        imageId: post.imageId,
      };
  
      if (hasFileToUpdate) {
        // Upload new file to appwrite storage
        const uploadedFile = await uploadFile(post.file[0]);
        if (!uploadedFile) throw Error;
  
        // Get new file url
        const fileUrl = getFilePreview(uploadedFile.$id);
        if (!fileUrl) {
          await deleteFile(uploadedFile.$id);
          throw Error;
        }
  
        image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
      }
  
      // Convert tags into array
      const tags = post.tags?.replace(/ /g, "").split(",") || [];
  
      //  Update post
      const updatedPost = await database.updateDocument(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        post.postId,
        {
          caption: post.caption,
          imageUrl: image.imageUrl,
          imageId: image.imageId,
          location: post.location,
          tags: tags,
        }
      );
  
      // Failed to update
      if (!updatedPost) {
        // Delete new file that has been recently uploaded
        if (hasFileToUpdate) {
          await deleteFile(image.imageId);
        }
  
        // If no new file uploaded, just throw error
        throw Error;
      }
  
      // Safely delete old file after successful update
      if (hasFileToUpdate) {
        await deleteFile(post.imageId);
      }
  
      return updatedPost;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== DELETE POST
  export async function deletePost(postId?: string, imageId?: string) {
    if (!postId || !imageId) return;
  
    try {
      const statusCode = await database.deleteDocument(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        postId
      );
  
      if (!statusCode) throw Error;
  
      await deleteFile(imageId);
  
      return { status: "Ok" };
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== LIKE / UNLIKE POST
  export async function likePost(postId: string, likesArray: string[]) {
    try {
      const updatedPost = await database.updateDocument(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        postId,
        {
          Likes: likesArray,
        }
      );
  
      if (!updatedPost) throw new Error('Failed to update post');
  
      return updatedPost;
    } catch (error) {
      console.error('Error updating post likes:', error);
      throw error;
    }
  }
  
  // ============================== SAVE POST
  export async function savePost(userId: string, postId: string) {
    try {
      const updatedPost = await database.createDocument(
        appwriteconfig.databaseId,
        appwriteconfig.saveCollectionId,
        ID.unique(),
        {
          user: userId,
          post: postId,
        }
      );
  
      if (!updatedPost) throw Error;
  
      return updatedPost;
    } catch (error) {
      console.log(error);
    }
  }
  // ============================== DELETE SAVED POST
  export async function deleteSavedPost(savedRecordId: string) {
    try {
      const statusCode = await database.deleteDocument(
        appwriteconfig.databaseId,
        appwriteconfig.saveCollectionId,
        savedRecordId
      );
  
      if (!statusCode) throw Error;
  
      return { status: "Ok" };
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== GET USER'S POST
  export async function getUserPosts(userId?: string) {
    if (!userId) return;
  
    try {
      const post = await database.listDocuments(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
      );
  
      if (!post) throw Error;
  
      return post;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)
  export async function getRecentPosts() {
    try {
      const posts = await database.listDocuments(
        appwriteconfig.databaseId,
        appwriteconfig.postCollectionId,
        [Query.orderDesc("$createdAt"), Query.limit(20)]
      );
  
      if (!posts) throw Error;
  
      return posts;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================================================
  // USER
  // ============================================================
  
  // ============================== GET USERS
  
  export async function getUsers(limit?: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queries: any[] = [Query.orderDesc("$createdAt")];
  
    if (limit) {
      queries.push(Query.limit(limit));
    }
  
    try {
      const users = await database.listDocuments(
        appwriteconfig.databaseId,
        appwriteconfig.userCollectionId,
        queries
      );
  
      if (!users) throw Error;
  
      return users;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== GET USER BY ID
  export async function getUserById(userId: string) {
    try {
      const user = await database.getDocument(
        appwriteconfig.databaseId,
        appwriteconfig.userCollectionId,
        userId
      );
  
      if (!user) throw Error;
  
      return user;
    } catch (error) {
      console.log(error);
    }
  }
  
  // ============================== UPDATE USER
  export async function updateUser(user: IUpdateUser) {
    const hasFileToUpdate = user.file.length > 0;
    try {
      let image = {
        imageUrl: user.imageUrl,
        imageId: user.imageId,
      };
  
      if (hasFileToUpdate) {
        // Upload new file to appwrite storage
        const uploadedFile = await uploadFile(user.file[0]);
        if (!uploadedFile) throw Error;
  
        // Get new file url
        const fileUrl = getFilePreview(uploadedFile.$id);
        if (!fileUrl) {
          await deleteFile(uploadedFile.$id);
          throw Error;
        }
  
        image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
      }
  
      //  Update user
      const updatedUser = await database.updateDocument(
        appwriteconfig.databaseId,
        appwriteconfig.userCollectionId,
        user.userId,
        {
          name: user.name,
          bio: user.bio,
          imageUrl: image.imageUrl,
          imageId: image.imageId,
        }
      );
  
      // Failed to update
      if (!updatedUser) {
        // Delete new file that has been recently uploaded
        if (hasFileToUpdate) {
          await deleteFile(image.imageId);
        }
        // If no new file uploaded, just throw error
        throw Error;
      }
  
      // Safely delete old file after successful update
      if (user.imageId && hasFileToUpdate) {
        await deleteFile(user.imageId);
      }
  
      return updatedUser;
    } catch (error) {
      console.log(error);
    }
  }
  