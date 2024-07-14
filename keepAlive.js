// Function to make the API request
const keepAlive = async () => {
  const dummyUser = { email: "ebentim4@gmail.com", password: "12345678" };
  console.log("I am running");
  try {
    const response = await fetch(
      "https://bakkers-driving-school.onrender.com/api/signin",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dummyUser),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("API request successful:", data);
    } else {
      console.error("API request failed:", response.status);
    }
  } catch (error) {
    console.error("Error making API request:", error);
  }
};
module.exports = keepAlive;
