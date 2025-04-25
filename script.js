// 🔧 Firebase Config (replace with your own config)
const firebaseConfig = {
  apiKey: "AIzaSyAXwVuFHsnmiRN-tan7JlsEgsJcESGAjGQ",
  authDomain: "real-time-chat-app-1b00c.firebaseapp.com",
  projectId: "real-time-chat-app-1b00c",
  storageBucket: "real-time-chat-app-1b00c.firebasestorage.app",
  messagingSenderId: "624744882702",
  appId: "1:624744882702:web:52aaf14e05c6f427f2d25f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🔐 Signup
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value; // Get the name
  const profilePictureInput = document.getElementById("profilePicture");
  const profilePictureFile = profilePictureInput.files[0];

  if (!name) {
    alert("Please enter your name.");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(async (userCredential) => { // Make the callback async
      const user = userCredential.user;

      let profilePictureURL = ""; // Default value

      if (profilePictureFile) {
        try {
          profilePictureURL = await uploadImageToImgur(profilePictureFile); // Upload the image
        } catch (error) {
          console.error("Error uploading to Imgur:", error);
          alert("Error uploading profile picture.  Using default.");
        }
      }

      // Store the name and profile picture URL in Firestore
      return db.collection("profiles").doc(email).set({
        name: name,
        profilePictureURL: profilePictureURL // Store the URL
      });
    })
    .then(() => {
      alert("Signed up!");
      window.location = "friends.html";
    })
    .catch(err => alert(err.message));
}

// ⬆️ Upload Image to Imgur
async function uploadImageToImgur(imageFile) {
  const clientId = "6323b8ad56b39fa"; // Replace with your Imgur Client ID
  const apiUrl = "https://api.imgur.com/3/image";

  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Client-ID ${clientId}`
    },
    body: formData
  });

  const data = await response.json();

  if (data.success) {
    return data.data.link; // Return the image URL
  } else {
    throw new Error("Imgur upload failed: " + data.data.error);
  }
}


// 🔐 Login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Logged in!");
      window.location = "friends.html";
    })
    .catch(err => alert(err.message));
}

// 🔓 Logout
function logout() {
  auth.signOut().then(() => {
    alert("Logged out!");
    window.location = "index.html";
  });
}

// ➕ Add Friend
function addFriend() {
  const friendEmail = document.getElementById("friendEmail").value;
  const user = auth.currentUser;
  if (!user || !friendEmail) return;

  db.collection("users").doc(user.email).set({
    friends: firebase.firestore.FieldValue.arrayUnion(friendEmail)
  }, { merge: true }).then(() => {
    alert("Friend added!");
    loadFriends();
  });
}

// ❌ Remove Friend
function removeFriend(friendEmail) {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users").doc(user.email).update({
    friends: firebase.firestore.FieldValue.arrayRemove(friendEmail)
  }).then(() => {
    alert("Friend removed!");
    loadFriends();
  });
}


// 📜 Load Friends
function loadFriends() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users").doc(user.email).get().then(async doc => {
    const data = doc.data();
    const friends = data?.friends || [];
    const list = document.getElementById("friendsList");
    list.innerHTML = "";

    for (const friend of friends) {
      console.log("Friend Email:", friend); // Add this line
      const friendDoc = await db.collection("profiles").doc(friend).get();
      console.log("Friend Doc:", friendDoc); // Add this line
      const friendData = friendDoc.data();
      console.log("Friend Data:", friendData); // Add this line
      const friendName = friendData?.name || friend;
      const friendProfilePictureURL = friendData?.profilePictureURL || ""; // Get the profile picture URL
      console.log("Friend Profile Picture URL:", friendProfilePictureURL); // Add this line

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.alignItems = "center"; // Vertically align items
      container.style.justifyContent = "space-between";
      container.style.marginBottom = "8px";

      // Profile Picture
      const profilePicture = document.createElement("img");
      profilePicture.src = friendProfilePictureURL;
      profilePicture.alt = friendName + "'s Profile Picture";
      profilePicture.style.width = "30px";
      profilePicture.style.height = "30px";
      profilePicture.style.borderRadius = "50%";
      profilePicture.style.marginRight = "10px";
      profilePicture.style.objectFit = "cover"; // Make the image fit the container
      if (!friendProfilePictureURL) {
        profilePicture.src = "https://via.placeholder.com/30"; // Default placeholder image
      }

      const btn = document.createElement("button");
      btn.textContent = friendName;
      btn.onclick = () => openChat(friend);
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';

      btn.insertBefore(profilePicture, btn.firstChild); // Insert profile picture before the button text

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.style.backgroundColor = "#e74c3c";
      removeBtn.style.marginLeft = "10px";
      removeBtn.onclick = () => removeFriend(friend);

      container.appendChild(btn);
      container.appendChild(removeBtn);
      list.appendChild(container);
    }
  });
}



// 🔄 Navigate to chat with friend
function openChat(friend) {
  window.location = `chat.html?friend=${encodeURIComponent(friend)}`;
}

// 💬 Send message in private chat
async function sendMessage() {
  const msg = document.getElementById("messageInput").value;
  const user = auth.currentUser;
  const friend = new URLSearchParams(window.location.search).get("friend");
  const imageInput = document.getElementById("imageUpload");
  const imageFile = imageInput.files[0];

  if (!user || !friend) return;

  const room = [user.email, friend].sort().join("_");

  let imageUrl = ""; // Default value

  if (imageFile) {
    try {
      imageUrl = await uploadImageToImgur(imageFile); // Upload the image
    } catch (error) {
      console.error("Error uploading to Imgur:", error);
      alert("Error uploading image. Message will be sent without the image.");
    }
  }

  // If there's no message and no image, don't send anything
  if (!msg.trim() && !imageUrl) return;

  db.collection("messages_" + room).add({
    text: msg,
    imageUrl: imageUrl, // Store the image URL
    user: user.email,
    time: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Clear input
  document.getElementById("messageInput").value = "";
  imageInput.value = ""; // Clear the image input

  // Clear typing
  db.collection("typing").doc(room).set({
    [user.email]: false
  }, { merge: true });
}

// 🧽 Clear Chat
function clearChat() {
  const user = auth.currentUser;
  const friend = new URLSearchParams(window.location.search).get("friend");
  if (!user || !friend) return;

  const room = [user.email, friend].sort().join("_");
  db.collection("messages_" + room).get().then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
  }).then(() => {
    alert("Chat cleared.");
  });
}

// 🧠 Typing indicator
function setupTypingIndicator(room, userEmail, friendEmail) {
  const input = document.getElementById("messageInput");
  const typingIndicator = document.getElementById("typingIndicator");

  input.addEventListener("input", () => {
    db.collection("typing").doc(room).set({
      [userEmail]: true
    }, { merge: true });

    setTimeout(() => {
      db.collection("typing").doc(room).set({
        [userEmail]: false
      }, { merge: true });
    }, 2000);
  });

  db.collection("typing").doc(room).onSnapshot(doc => {
    const data = doc.data();
    if (data?.[friendEmail]) {
      typingIndicator.style.display = "block";
    } else {
      typingIndicator.style.display = "none";
    }
  });
}

// 📡 Listen for messages in private chat
if (window.location.pathname.includes("chat.html")) {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location = "index.html";
    } else {
      const friend = new URLSearchParams(window.location.search).get("friend");
      const room = [user.email, friend].sort().join("_");

      // Start typing indicator
      setupTypingIndicator(room, user.email, friend);

      // Listen for messages
      db.collection("messages_" + room)
        .orderBy("time")
        .onSnapshot(snapshot => {
          renderMessages(snapshot);
        });
    }
  });
}

// 👫 Load friends on friends.html
if (window.location.pathname.includes("friends.html")) {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location = "index.html";
    } else {
      loadFriends();
    }
  });
}

// 📄 Render chat messages
async function renderMessages(snapshot) {
  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = "";

  const friend = new URLSearchParams(window.location.search).get("friend");
  const user = auth.currentUser;

  for (const doc of snapshot.docs) {
    const msg = doc.data();
    const time = msg.time?.toDate().toLocaleTimeString() || "";

    let nameToShow = msg.user;
    const profile = await db.collection("profiles").doc(msg.user).get();
    if (profile.exists) {
      nameToShow = profile.data().name;
    }

    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message " + (msg.user === user.email ? "sent" : "received");

    let messageContent = `<strong>${nameToShow}:</strong> `;

    if (msg.imageUrl) {
      messageContent += `<img src="${msg.imageUrl}" alt="Image" />`; // Display the image
    }

    messageContent += `${msg.text} <small>(${time})</small>`; // Display the text

    msgDiv.innerHTML = messageContent;
    chatBox.appendChild(msgDiv);
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🌗 Toggle Dark Mode with icon and label switch
function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");

  const btn = document.getElementById("themeToggleBtn");
  if (isDark) {
    btn.innerHTML = "☀️ Toggle to Light Mode";
  } else {
    btn.innerHTML = "🌙 Toggle to Dark Mode";
  }
}

// 🌗 Apply dark mode and update toggle button on page load
window.addEventListener("load", () => {
  const btn = document.getElementById("themeToggleBtn");
  const isDarkMode = localStorage.getItem("darkMode") === "enabled";

  if (isDarkMode) {
    document.body.classList.add("dark");
    btn.innerHTML = "☀️ Toggle to Light Mode";
  } else {
    btn.innerHTML = "🌙 Toggle to Dark Mode";
  }
});

// Add the following variables at the top of your script.js
let localStream = null;
let peerConnection = null;
const callControls = document.getElementById("callControls");

// Step 1: Get user's media (audio)
async function getMedia() {
  const constraints = { audio: true, video: false };
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById("remoteAudio").srcObject = localStream;
}

// Step 2: Start the call
async function startCall() {
  await getMedia();

  // Show call controls
  callControls.style.display = "flex";

  // Setup peer connection and create offer
  peerConnection = new RTCPeerConnection();
  peerConnection.addEventListener("icecandidate", event => {
    if (event.candidate) {
      // Send the ICE candidate to the other peer
    }
  });

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send offer to the other peer (you would need to integrate signaling here)
}

function endCall() {
  if (peerConnection) {
    // Stop all tracks in the local stream
    localStream.getTracks().forEach(track => {
      track.stop();
    });

    // Close the peer connection
    peerConnection.close();
    peerConnection = null;

    // Hide call controls (UI elements)
    callControls.style.display = "none";

    // Optionally, you can reset the remote audio stream
    const remoteAudio = document.getElementById("remoteAudio");
    remoteAudio.srcObject = null; // Clear the remote audio stream
  }
}

function forgotPassword() {

  const email = prompt("Enter your email address:");

  if (email) {

      auth.sendPasswordResetEmail(email)

          .then(() => {

              alert("Password reset email sent! Check your inbox.");

          })

          .catch((error) => {

              alert("Error sending password reset email: " + error.message);

          });

  } else {

      alert("Email address is required.");

  }

}

