#! /usr/bin/env python3
import shodan
import time
from datetime import date

# Input API key
with open("api.txt", "r") as apikey:
    SHODAN_API_KEY = apikey.readline()
api = shodan.Shodan(SHODAN_API_KEY)

# Query Shodan
def request_page_from_shodan(query, page=1):
    while True:
        try:
            instances = api.search(query, page=page)
            return instances
        except shodan.APIError as e:
            print(f"Error: {e}")
            time.sleep(5)

# searches on shodan using the given query, and iterates over each page of the results
def process_page(page):
    print(len(page['matches']))
    for match in page['matches']:
        with open("ip_str_ll_" + str(date.today()) + ".csv", "a") as file:
            file.writelines(f"{match['ip_str']}, {match['location']['longitude']}, {match['location']['latitude']},\n")

def query_shodan(query):
    for i in range (1000):
        print("[*] querying the " + str(i) + " page")
        first_page = request_page_from_shodan(query,i)
        process_page(first_page)

# search for minecraft 1.18 servers
if __name__ == "__main__":
    query_shodan('minecraft 1.18')