import shodan
import math
from sqlalchemy import Column, String, Integer, Float
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from typing import List, Dict

QUERY: str = 'minecraft 1.18'
DATABASE_FILENAME: str = 'servers.db'

engine = create_engine(f'sqlite:///{DATABASE_FILENAME}')
Base = declarative_base()


class Match(Base):
    __tablename__ = 'servers'

    ip = Column(String, primary_key=True)
    timestamp = Column(String)
    org = Column(String)
    isp = Column(String)
    port = Column(Integer)
    version = Column(String)
    max_players = Column(Integer)
    online_players = Column(Integer)
    # description: str
    city = Column(String)
    region_code = Column(String)
    longitude = Column(Float)
    latitude = Column(Float)
    country_code = Column(String)
    country_name = Column(String)


# Input API key
with open("api.txt", "r") as apikey:
    SHODAN_API_KEY = apikey.readline()
api = shodan.Shodan(SHODAN_API_KEY)

Session = sessionmaker(bind=engine)
session = Session()


def query_shodan_api(page_number: int = 1):
    try:
        print(f'Rate Limit {api.info()}')
        instances = api.search(QUERY, page=page_number)
        return instances
    except shodan.APIError as e:
        print(f"Error: {e}")


def get_description(description: Dict) -> str:
    if description['text']:
        print('Here')


def flatten_results(instances: Dict) -> List:
    results = []

    if instances is None:
        print("No instances found")
        return []

    for result in instances['matches']:
        minecraft = result['minecraft']
        location = result['location']
        players = minecraft['players']
        description = minecraft['description']

        # print(type(result))
        # print(type(minecraft))
        # print(type(location))
        # print(type(players))
        # skipping for now
        # print(type(description))

        if type(description) == str:
            print(description)
        elif description['text']:
            print('TEXT')
        elif 'extra' in description.keys():
            print('EXTRA')
        else:
            print("You shouldn't be here")

        if session.query(Match.ip).filter_by(ip=result['ip_str']).count() == 0:
            results.append(
                Match(ip=result['ip_str'], timestamp=result['timestamp'], org=result['org'], isp=result['isp'],
                      port=result['port'], version=result['version'], max_players=players['max'],
                      online_players=players['online'], city=location['city'],
                      region_code=location['region_code'],
                      longitude=location['longitude'], latitude=location['latitude'],
                      country_code=location['country_code'], country_name=location['country_name']))
    return results


if __name__ == '__main__':
    # initialize the tables
    ins = inspect(engine)
    if not ins.has_table(Match.__tablename__):
        Match.__table__.create(bind=engine)
    total_pages: int = math.ceil(api.count(QUERY)['total'] / 100)
    current_page: int = 1
    # testing
    total_pages = 12
    while current_page < total_pages:
        print(f'Querying page: {current_page}')
        api_result = query_shodan_api(current_page)
        flattened_results = flatten_results(api_result)
        session.add_all(flattened_results)
        session.commit()
        current_page += 1

# 9535
