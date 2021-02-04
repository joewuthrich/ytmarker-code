var stripe = Stripe('pk_test_51IGdVQG7d9GmhCkUKdEG16P1KvtQbckzO7FLQMLJakIDyt96duM2tGva0UslkQB9EdT0ElAq4DdezqkQir57YsHL00P5vVDwRI');

var createCheckoutSession = function(priceId) {
    return fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        priceId: priceId
      })
    }).then(function(result) {
      return result.json();
    });
  };

document
  .getElementById("checkout")
  .addEventListener("click", function(evt) {
    createCheckoutSession('price_1IGduWG7d9GmhCkUjm1pl8My').then(function(data) {
      // Call Stripe.js method to redirect to the new Checkout page
      stripe
        .redirectToCheckout({
          sessionId: data.sessionId
        })
        .then(handleResult);
    });
  });