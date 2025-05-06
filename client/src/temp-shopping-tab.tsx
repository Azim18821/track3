{hasShoppingList && (
  <TabsContent value="shopping" className={isMobile ? "mt-4" : "mt-6"}>
    {(() => {
      try {
        const shoppingItems = plan.shoppingList || plan.preferences?.shoppingList || [];
        const budgetLimit = typeof plan.preferences.budget === 'number' 
          ? plan.preferences.budget 
          : 50; // Default budget
        const storeRecommendations = plan.suggestedStores || plan.preferences?.suggestedStores || [];
        
        return (
          <>
            <ShoppingList 
              shoppingItems={shoppingItems} 
              budgetLimit={budgetLimit} 
              isMobile={isMobile} 
            />
            {storeRecommendations.length > 0 && (
              <StoreRecommendationCard stores={storeRecommendations} />
            )}
          </>
        );
      } catch (err) {
        console.error('Error rendering shopping list:', err);
        return (
          <Card>
            <CardContent className="py-6">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium mb-1">Error Loading Shopping List</h3>
                <p className="text-muted-foreground">
                  There was a problem loading your shopping list. Please try refreshing the page.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      }
    })()}
  </TabsContent>
)}